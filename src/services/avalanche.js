import { ethers } from 'ethers';

const FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const ECHO_RPC = 'https://subnets.avax.network/echo/testnet/rpc';
const DISPATCH_RPC = 'https://subnets.avax.network/dispatch/testnet/rpc';
const DEXALOT_RPC = 'https://subnets.avax.network/dexalot/testnet/rpc';
const P_CHAIN_RPC = 'https://api.avax-test.network/ext/bc/P';
const X_CHAIN_RPC = 'https://api.avax-test.network/ext/bc/X';

/**
 * Returns the AVAX balance of the given address on the Avalanche Fuji testnet.
 * @param {string} address - A checksummed or lowercase EVM address.
 * @returns {Promise<string>} Balance in AVAX (e.g. "1.234567890123456789")
 */
export async function getAvaxBalance(address, rpcUrl = FUJI_RPC) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}

/**
 * Returns the ETH balance of the given address on the Sepolia testnet.
 * @param {string} address - A checksummed or lowercase EVM address.
 * @returns {Promise<string>} Balance in ETH (e.g. "0.123456789012345678")
 */
export async function getSepoliaBalance(address, rpcUrl = SEPOLIA_RPC) {
  console.log('[ETH] fetching balance for', address, 'via', rpcUrl);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const balanceWei = await provider.getBalance(address);
  console.log('[ETH] raw balanceWei:', balanceWei.toString());
  const formatted = ethers.formatEther(balanceWei);
  console.log('[ETH] formatted ETH:', formatted);
  return formatted;
}

export async function getEchoBalance(address) {
  const provider = new ethers.JsonRpcProvider(ECHO_RPC);
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}

export async function getDispatchBalance(address) {
  const provider = new ethers.JsonRpcProvider(DISPATCH_RPC);
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}

export async function getDexalotBalance(address) {
  const provider = new ethers.JsonRpcProvider(DEXALOT_RPC);
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}

/**
 * Returns the AVAX balance of the given address on the Avalanche Fuji P-Chain.
 * @param {string} address - Bech32 address without chain prefix (e.g. "fuji1w4z...")
 * @returns {Promise<string>} Balance in AVAX
 */
export async function getPChainBalance(address, rpcUrl = P_CHAIN_RPC) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'platform.getBalance',
      params: { addresses: [`P-${address}`] },
      id: 1,
    }),
  });
  const data = await res.json();
  const nAvax = BigInt(data.result.balance);
  return (Number(nAvax) / 1e9).toString();
}

/**
 * Returns the AVAX balance of the given address on the Avalanche Fuji X-Chain.
 * @param {string} address - Bech32 address without chain prefix (e.g. "fuji1w4z...")
 * @returns {Promise<string>} Balance in AVAX
 */
export async function getXChainBalance(address, rpcUrl = X_CHAIN_RPC) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'avm.getBalance',
      params: { address: `X-${address}`, assetID: 'AVAX' },
      id: 1,
    }),
  });
  const data = await res.json();
  const nAvax = BigInt(data.result.balance);
  return (Number(nAvax) / 1e9).toString();
}
