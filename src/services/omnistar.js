import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

export const CHAIN_ID = 'omnistar';
export const RPC_URL = 'http://prod-full-1.omnistar.io:26657';
export const LCD_URL = 'http://prod-full-1.omnistar.io:1317';
export const API_SERVER_URL = 'https://reverse-proxy.omnistar.io/mainnet/proxy';
export const SNAPSHOT_URL = 'https://reverse-proxy.omnistar.io/mainnet/node';
const API_KEY = 'nft.r@bit2safe.wikey.io';
const API_HEADERS = { 'Content-Type': 'application/json', 'api-key': API_KEY, 'env': 'main' };
export const FEE_DENOM = 'nost';
export const GAS_PRICE = 11; // nost per gas unit
export const GAS_FALLBACK = 300000; // used if simulation fails
export const GAS_MULTIPLIER = 1.3; // 30% buffer on top of simulated gas
export const OST_EXPONENT = 9; // 1 OST = 10^9 nost

const USERNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.]*[a-zA-Z0-9])?$/;

export function validateUsername(username) {
  if (!username || username.length < 2) return 'Username must be at least 2 characters';
  if (!USERNAME_RE.test(username)) return 'Only letters, numbers and dots. Cannot start/end with dot or have consecutive dots';
  if (/\.\./.test(username)) return 'No consecutive dots allowed';
  return null;
}

export async function checkUsernameAvailability(username) {
  try {
    const res = await fetch(`${API_SERVER_URL}/users/accounts/getAccountByName/?accountName=${encodeURIComponent(username)}`, {
      headers: API_HEADERS,
    });
    if (res.ok) {
      const data = await res.json();
      return { available: !data.public_key, suggestion: `${username}_${Math.floor(Math.random() * 1000)}` };
    }
    if (res.status === 404) return { available: true };
  } catch {
    // API not reachable – treat as available for now
  }
  return { available: true };
}

export async function registerUsername(username, address) {
  try {
    await fetch(`${API_SERVER_URL}/users/accounts/createAccount`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ displayName: username, name: username, address, env: 'mainnet', name_source: 'wallet-cli' }),
    });
  } catch {
    // best-effort
  }
}

export async function getAccount(address) {
  try {
    const res = await fetch(`${LCD_URL}/cosmos/auth/v1beta1/accounts/${encodeURIComponent(address)}`);
    if (res.ok) {
      const data = await res.json();
      const acc = data?.account;
      return {
        accountNumber: parseInt(acc?.account_number ?? '0', 10),
        sequence: parseInt(acc?.sequence ?? '0', 10),
      };
    }
  } catch (e) {
    console.error('[getAccount] error:', e);
  }
  return { accountNumber: 0, sequence: 0 };
}

export async function getBalance(address) {
  try {
    const res = await fetch(`${LCD_URL}/cosmos/bank/v1beta1/balances/${encodeURIComponent(address)}`);
    if (res.ok) {
      const data = await res.json();
      const nostEntry = (data?.balances ?? []).find(b => b.denom === 'nost');
      const nost = nostEntry?.amount ?? '0';
      return { nost, ost: formatOST(nost) };
    }
  } catch {
    // LCD not reachable
  }
  return { nost: '0', ost: '0.0000' };
}

export async function getMPCWallets(address) {
  try {
    const res = await fetch(`${SNAPSHOT_URL}/snapshot/client?env=main&publickey=${encodeURIComponent(address)}`);
    if (res.ok) {
      const snapshots = await res.json();
      const assets = snapshots?.[0]?.assets?.assets ?? [];
      const wallets = {};
      for (const a of assets) {
        wallets[a.symbol] = a.address;
      }
      return wallets;
    }
  } catch {
    // API not reachable
  }
  return {};
}

export async function getAssetBalances(address) {
  try {
    const snapRes = await fetch(`${SNAPSHOT_URL}/snapshot/client?env=main&publickey=${encodeURIComponent(address)}`);
    if (!snapRes.ok) return [];
    const snapshots = await snapRes.json();
    const safeAddress = snapshots?.[0]?.address;
    const assets = snapshots?.[0]?.assets?.assets ?? [];
    if (!assets.length) return [];

    const res = await fetch(`${API_SERVER_URL}/api/assets/`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({
        assets: assets.map(a => ({ symbol: a.symbol, address: a.address })),
        safe_address: safeAddress,
        isMain: 'true',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.assets ?? [];
    }
  } catch {
    // API not reachable
  }
  return [];
}

export function buildCreateSafeTx(creator, username, pubKeyBase64, accountNumber, sequence) {
  const id = () => crypto.randomUUID();

  const msgs = [
    {
      type: 'omnistar/MsgCreateData',
      value: {
        creator,
        destination: creator,
        data: JSON.stringify({ class: 'policy', id: id(), action: 'genesis-policy-create-by-safe', username }),
      },
    },
    {
      type: 'omnistar/MsgCreateData',
      value: {
        creator,
        destination: creator,
        data: JSON.stringify({ class: 'group', id: id(), name: 'Primary', username }),
      },
    },
    {
      type: 'omnistar/MsgCreateData',
      value: {
        creator,
        destination: creator,
        data: JSON.stringify({ class: 'policy', id: id(), action: 'genesis-policy-on-profiles', username }),
      },
    },
    {
      type: 'omnistar/MsgCreateData',
      value: {
        creator,
        destination: creator,
        data: JSON.stringify({ class: 'profile', id: id(), username, pubKey: pubKeyBase64 }),
      },
    },
    {
      type: 'omnistar/MsgCreateData',
      value: {
        creator,
        destination: creator,
        data: JSON.stringify({ class: 'policy', id: id(), action: 'allow-functions', username }),
      },
    },
    {
      type: 'omnistar/MsgCreateData',
      value: {
        creator,
        destination: creator,
        data: JSON.stringify({ class: 'user', id: id(), username, pubKey: pubKeyBase64 }),
      },
    },
    {
      type: 'omnistar/MsgCreateData',
      value: {
        creator,
        destination: creator,
        data: JSON.stringify({ class: 'policy', id: id(), action: 'genesis-policy-delete-object', username }),
      },
    },
    {
      type: 'omnistar/MsgCreateData',
      value: {
        creator,
        destination: creator,
        data: JSON.stringify({ class: 'policy', id: id(), action: 'allow-update-user-address', username }),
      },
    },
    {
      type: 'omnistar/MsgCreateData',
      value: {
        creator,
        destination: creator,
        data: JSON.stringify({ class: 'registry', id: id(), action: 'register-safe', username }),
      },
    },
  ];

  return {
    chain_id: CHAIN_ID,
    account_number: String(accountNumber),
    sequence: String(sequence),
    fee: { amount: [{ denom: FEE_DENOM, amount: String(GAS_FALLBACK * GAS_PRICE) }], gas: String(GAS_FALLBACK) },
    msgs,
    memo: '',
  };
}

// ─── Minimal protobuf encoder ────────────────────────────────────────────────

function pbVarintEncode(n) {
  const out = [];
  while (n > 0x7f) { out.push((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
  out.push(n);
  return new Uint8Array(out);
}
function pbConcat(...arrays) {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}
function pbStr(f, v) {
  if (!v) return new Uint8Array(0); // proto3: omit default (empty string)
  const d = new TextEncoder().encode(v);
  return pbConcat(pbVarintEncode((f << 3) | 2), pbVarintEncode(d.length), d);
}
function pbByt(f, v) {
  if (!v || v.length === 0) return new Uint8Array(0); // proto3: omit default (empty bytes)
  return pbConcat(pbVarintEncode((f << 3) | 2), pbVarintEncode(v.length), v);
}
function pbUint(f, v) {
  if (v === 0) return new Uint8Array(0); // proto3: omit default (zero)
  return pbConcat(pbVarintEncode((f << 3) | 0), pbVarintEncode(v));
}
function pbMsg(f, v) { return pbByt(f, v); }

function encodeMsgCreateData(creator, destination, data) {
  return pbConcat(pbStr(1, creator), pbStr(2, destination), pbStr(3, data));
}
function encodeAny(typeUrl, valueBytes) {
  return pbConcat(pbStr(1, typeUrl), pbByt(2, valueBytes));
}
function encodeTxBody(msgs) {
  let body = new Uint8Array();
  for (const msg of msgs) {
    const m = encodeMsgCreateData(msg.value.creator, msg.value.destination, msg.value.data);
    body = pbConcat(body, pbMsg(1, encodeAny('/omnistar.omnistar.MsgCreateData', m)));
  }
  return body;
}
function encodeAuthInfo(pubKeyBytes, sequence, signMode = 1, gasLimit = GAS_FALLBACK) {
  const feeAmount = String(gasLimit * GAS_PRICE);
  // PubKey Any: /cosmos.crypto.secp256k1.PubKey { bytes key = 1; }
  const pk = pbConcat(pbStr(1, '/cosmos.crypto.secp256k1.PubKey'), pbByt(2, pbByt(1, pubKeyBytes)));
  // ModeInfo { Single { mode = signMode } }  1 = DIRECT, 127 = LEGACY_AMINO_JSON
  const modeInfo = pbMsg(1, pbUint(1, signMode));
  // SignerInfo
  const signerInfo = pbConcat(pbMsg(1, pk), pbMsg(2, modeInfo), pbUint(3, sequence));
  // Fee { amount: [Coin{denom,amount}], gas_limit }
  const coin = pbConcat(pbStr(1, FEE_DENOM), pbStr(2, feeAmount));
  const fee = pbConcat(pbMsg(1, coin), pbUint(2, gasLimit));
  return pbConcat(pbMsg(1, signerInfo), pbMsg(2, fee));
}

async function simulateGas(bodyBytes, authInfoBytes) {
  try {
    const zeroSig = new Uint8Array(64);
    const simTx = pbConcat(pbByt(1, bodyBytes), pbByt(2, authInfoBytes), pbByt(3, zeroSig));
    const res = await fetch(`${LCD_URL}/cosmos/tx/v1beta1/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_bytes: btoa(String.fromCharCode(...simTx)) }),
    });
    if (res.ok) {
      const data = await res.json();
      const used = parseInt(data?.gas_info?.gas_used ?? '0', 10);
      if (used > 0) return used;
    }
  } catch { /* fall through to default */ }
  return null;
}

function encodeSignDoc(bodyBytes, authInfoBytes, chainId, accountNumber) {
  // Omnistar SignDoc: no sequence field (sequence is only in SignerInfo inside authInfoBytes)
  return pbConcat(
    pbByt(1, bodyBytes),
    pbByt(2, authInfoBytes),
    pbStr(3, chainId),
    pbUint(4, accountNumber),
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function signAmino(signDoc, privKey) {
  const canonical = JSON.stringify(sortObjectKeys(signDoc));
  const hash = sha256(new TextEncoder().encode(canonical));
  const sig = secp256k1.sign(hash, privKey, { lowS: true });
  const sigBytes = sig.toCompactRawBytes();
  const pubKeyBytes = secp256k1.getPublicKey(privKey, true);
  return {
    signature: btoa(String.fromCharCode(...sigBytes)),
    pubKey: btoa(String.fromCharCode(...pubKeyBytes)),
  };
}

export async function broadcastTx(txBytes) {
  try {
    const txBase64 = btoa(String.fromCharCode(...txBytes));
    const res = await fetch(`${RPC_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'broadcast_tx_sync', params: { tx: txBase64 } }),
    });
    const data = await res.json();
    const result = data?.result ?? {};
    return {
      code: result.code ?? 0,
      txhash: result.hash ?? '',
      rawLog: result.log ?? '',
    };
  } catch (e) {
    return { code: 1, txhash: '', rawLog: String(e) };
  }
}

export async function buildAndSign({ creator, username, pubKeyBase64, privKey }) {
  const { accountNumber, sequence } = await getAccount(creator);
  const signDoc = buildCreateSafeTx(creator, username, pubKeyBase64, accountNumber, sequence);

  const pubKeyBytes = secp256k1.getPublicKey(privKey, true);
  const bodyBytes = encodeTxBody(signDoc.msgs);

  // Simulate with fallback gas to get real estimate, then re-encode with actual gas + 30% buffer
  const simAuthInfo = encodeAuthInfo(pubKeyBytes, sequence, 1, GAS_FALLBACK);
  const gasUsed = await simulateGas(bodyBytes, simAuthInfo);
  const gasLimit = gasUsed ? Math.ceil(gasUsed * GAS_MULTIPLIER) : GAS_FALLBACK;
  const authInfoBytes = encodeAuthInfo(pubKeyBytes, sequence, 1, gasLimit);

  const signDocBytes = encodeSignDoc(bodyBytes, authInfoBytes, CHAIN_ID, accountNumber);
  const signDocHash = sha256(signDocBytes);
  const sigBytes = secp256k1.sign(signDocHash, privKey, { lowS: true }).toCompactRawBytes();
  const txRaw = pbConcat(pbByt(1, bodyBytes), pbByt(2, authInfoBytes), pbByt(3, sigBytes));

  return { signDoc, signature: txRaw, pubKey: btoa(String.fromCharCode(...pubKeyBytes)) };
}

export function formatOST(nost) {
  const n = typeof nost === 'string' ? BigInt(nost || '0') : BigInt(Math.floor(Number(nost)));
  const whole = n / BigInt(10 ** OST_EXPONENT);
  const frac = n % BigInt(10 ** OST_EXPONENT);
  const fracStr = frac.toString().padStart(OST_EXPONENT, '0').slice(0, 4);
  return `${whole}.${fracStr}`;
}

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, k) => { acc[k] = sortObjectKeys(obj[k]); return acc; }, {});
  }
  return obj;
}
