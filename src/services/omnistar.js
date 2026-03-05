import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

export const CHAIN_ID = 'omnistar';
export const RPC_URL = 'http://prod-full-1.omnistar.io:26657';
export const LCD_URL = 'http://prod-full-1.omnistar.io:1317';
export const API_SERVER_URL = 'https://reverse-proxy.omnistar.io/mainnet/proxy';
const API_KEY = 'nft.r@bit2safe.wikey.io';
export const FEE_DENOM = 'nost';
export const FEE_AMOUNT = '5000';
export const GAS = '200000';
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
    const res = await fetch(`${API_SERVER_URL}/api/username/${encodeURIComponent(username)}`, {
      headers: { 'x-api-key': API_KEY },
    });
    if (res.ok) {
      const data = await res.json();
      return { available: !data.exists, suggestion: data.suggestion };
    }
  } catch {
    // API not reachable – treat as available for now
  }
  return { available: true };
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
  } catch {
    // LCD not reachable
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
    const res = await fetch(`${API_SERVER_URL}/api/safe/${encodeURIComponent(address)}/wallets`, {
      headers: { 'x-api-key': API_KEY },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // API not reachable
  }
  // Return mock placeholder addresses
  return {
    BTC: '',
    ETH: '',
    XRP: '',
    SOL: '',
    AVAX: '',
    DOGE: '',
    SHIB: '',
    ADA: '',
    BASE: '',
  };
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
    fee: { amount: [{ denom: FEE_DENOM, amount: FEE_AMOUNT }], gas: GAS },
    msgs,
    memo: '',
  };
}

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

export async function broadcastTx(signedTx) {
  try {
    // Use legacy Amino REST endpoint — accepts StdTx JSON directly, no protobuf needed
    const res = await fetch(`${LCD_URL}/txs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx: signedTx, mode: 'sync' }),
    });
    const data = await res.json();
    return {
      code: data.code ?? 0,
      txhash: data.txhash ?? '',
      rawLog: data.raw_log ?? '',
    };
  } catch (e) {
    return { code: 1, txhash: '', rawLog: String(e) };
  }
}

export async function buildAndSign({ creator, username, pubKeyBase64, privKey }) {
  const { accountNumber, sequence } = await getAccount(creator);
  const signDoc = buildCreateSafeTx(creator, username, pubKeyBase64, accountNumber, sequence);
  const { signature, pubKey } = signAmino(signDoc, privKey);

  // Assemble StdTx (Amino broadcast format)
  const signedTx = {
    type: 'cosmos-sdk/StdTx',
    value: {
      msg: signDoc.msgs,
      fee: signDoc.fee,
      signatures: [{
        pub_key: { type: 'tendermint/PubKeySecp256k1', value: pubKey },
        signature,
      }],
      memo: signDoc.memo,
    },
  };

  return { signDoc, signature: signedTx, pubKey };
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
