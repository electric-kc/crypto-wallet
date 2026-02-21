import { ethers } from 'ethers';

const FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';

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
