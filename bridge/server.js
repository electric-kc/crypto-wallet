#!/usr/bin/env node
'use strict';

const http = require('http');
const crypto = require('crypto');

const SSP_URL      = process.env.SSP_URL      || 'http://127.0.0.1:8080';
const BRIDGE_PORT  = parseInt(process.env.BRIDGE_PORT  || '8081', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

// ── State ─────────────────────────────────────────────────────────────────────

let sessionSecret  = null; // Buffer(32), mlocked via wrapper
let nonce          = 0;
let sspPubKeyHex   = null; // hex-encoded compressed SEC1 (33 bytes)

// ── Startup ───────────────────────────────────────────────────────────────────

function readSecret() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', d => chunks.push(d));
    process.stdin.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (buf.length !== 32) {
        reject(new Error(`expected 32-byte session secret, got ${buf.length}`));
      } else {
        resolve(buf);
      }
    });
    process.stdin.on('error', reject);
  });
}

async function fetchSspPubKey() {
  const res = await fetch(`${SSP_URL}/v1/keys`);
  if (!res.ok) throw new Error(`SSP /v1/keys returned ${res.status}`);
  const keys = await res.json();
  if (!keys.length) throw new Error('SSP has no keys');
  return keys[0].publicKey; // hex compressed SEC1
}

// ── HMAC proof ────────────────────────────────────────────────────────────────

function buildProof(nonceVal, dataBytes, pubKeyBytes) {
  const nonceBuf = Buffer.alloc(8);
  nonceBuf.writeBigUInt64BE(BigInt(nonceVal));
  const msg = Buffer.concat([nonceBuf, dataBytes, pubKeyBytes]);
  const mac = crypto.createHmac('sha256', sessionSecret).update(msg).digest('base64');
  return Buffer.from(JSON.stringify({ nonce: nonceVal, hmac: mac })).toString('base64');
}

// ── SSP call ──────────────────────────────────────────────────────────────────

async function callSSP(hashBytes) {
  const pubKeyBytes = Buffer.from(sspPubKeyHex, 'hex');

  const doRequest = async (n) => {
    const proof = buildProof(n, hashBytes, pubKeyBytes);
    const body = JSON.stringify({
      requestId:     `req-${n}`,
      unsignedData:  hashBytes.toString('hex'),
      signingPubKey: sspPubKeyHex,
      proof,
    });
    return fetch(`${SSP_URL}/v1/sign`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  };

  nonce++;
  let res = await doRequest(nonce);

  // 403 = nonce replay; retry once with incremented nonce
  if (res.status === 403) {
    nonce++;
    res = await doRequest(nonce);
    if (res.status === 403) throw new Error('SSP auth failed: invalid HMAC or nonce');
  }

  if (!res.ok) throw new Error(`SSP error ${res.status}`);
  return res.json();
}

// ── DER → compact (R‖S, 64 bytes) ────────────────────────────────────────────

function derToCompact(derHex) {
  const der = Buffer.from(derHex, 'hex');
  if (der[0] !== 0x30) throw new Error('invalid DER signature');
  let pos = 2; // skip 0x30 <total-len>
  if (der[pos] !== 0x02) throw new Error('invalid DER: expected INTEGER for R');
  pos++;
  const rLen = der[pos++];
  let r = der.slice(pos, pos + rLen);
  pos += rLen;
  if (der[pos] !== 0x02) throw new Error('invalid DER: expected INTEGER for S');
  pos++;
  const sLen = der[pos++];
  let s = der.slice(pos, pos + sLen);

  // DER may prepend 0x00 when high bit is set — strip it
  while (r.length > 32 && r[0] === 0x00) r = r.slice(1);
  while (s.length > 32 && s[0] === 0x00) s = s.slice(1);

  const compact = Buffer.alloc(64, 0);
  r.copy(compact, 32 - r.length);
  s.copy(compact, 64 - s.length);
  return compact;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function sendJSON(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Server ────────────────────────────────────────────────────────────────────

function startServer() {
  const pubKeyBase64 = Buffer.from(sspPubKeyHex, 'hex').toString('base64');

  const server = http.createServer(async (req, res) => {
    setCORS(res);
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // GET /health
    if (req.method === 'GET' && req.url === '/health') {
      return sendJSON(res, 200, { ok: true });
    }

    // GET /pubkey
    if (req.method === 'GET' && req.url === '/pubkey') {
      return sendJSON(res, 200, { pubKey: pubKeyBase64 });
    }

    // POST /sign
    if (req.method === 'POST' && req.url === '/sign') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { requestId, preimage } = JSON.parse(body);
          if (!preimage) return sendJSON(res, 400, { error: 'missing preimage' });

          const preimageBytes = Buffer.from(preimage, 'hex');
          const hashBytes     = crypto.createHash('sha256').update(preimageBytes).digest();

          let sspResult;
          try {
            sspResult = await callSSP(hashBytes);
          } catch (e) {
            const msg = String(e.message || e);
            if (msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
              return sendJSON(res, 503, { error: 'SSP unreachable' });
            }
            return sendJSON(res, 503, { error: msg });
          }

          const compact = derToCompact(sspResult.signature);
          return sendJSON(res, 200, {
            requestId: requestId ?? null,
            signature: compact.toString('base64'),
            pubKey:    pubKeyBase64,
          });
        } catch (e) {
          return sendJSON(res, 500, { error: String(e) });
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(BRIDGE_PORT, '127.0.0.1', () => {
    console.log(`[bridge] listening on http://127.0.0.1:${BRIDGE_PORT}`);
    console.log(`[bridge] SSP: ${SSP_URL}`);
    console.log(`[bridge] pubKey: ${sspPubKeyHex}`);
  });
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

function shutdown() {
  if (sessionSecret) { sessionSecret.fill(0); sessionSecret = null; }
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  sessionSecret = await readSecret();
  process.stdin.destroy(); // close stdin — secret is read, no longer needed

  sspPubKeyHex = await fetchSspPubKey();
  startServer();
}

main().catch(err => {
  console.error('[bridge] startup failed:', err.message);
  process.exit(1);
});
