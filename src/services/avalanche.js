import { ethers } from 'ethers';

const FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const SEPOLIA_RPC = 'https://rpc.sepolia.org';

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
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}
