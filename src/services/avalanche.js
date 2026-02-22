import { ethers } from 'ethers';

const FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const ECHO_RPC = 'https://subnets.avax.network/echo/testnet/rpc';
const DISPATCH_RPC = 'https://subnets.avax.network/dispatch/testnet/rpc';
const DEXALOT_RPC = 'https://subnets.avax.network/dexalot/testnet/rpc';

/**
 * Returns the AVAX balance of the given address on the Avalanche Fuji testnet.
 * @param {string} address - A checksummed or lowercase EVM address.
 * @returns {Promise<string>} Balance in AVAX (e.g. "1.234567890123456789")
 */
export async function getAvaxBalance(address) {
  const provider = new ethers.JsonRpcProvider(FUJI_RPC);
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}

/**
 * Returns the ETH balance of the given address on the Sepolia testnet.
 * @param {string} address - A checksummed or lowercase EVM address.
 * @returns {Promise<string>} Balance in ETH (e.g. "0.123456789012345678")
 */
export async function getSepoliaBalance(address) {
  console.log('[Sepolia] fetching balance for', address, 'via', SEPOLIA_RPC);
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const balanceWei = await provider.getBalance(address);
  console.log('[Sepolia] raw balanceWei:', balanceWei.toString());
  const formatted = ethers.formatEther(balanceWei);
  console.log('[Sepolia] formatted ETH:', formatted);
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
