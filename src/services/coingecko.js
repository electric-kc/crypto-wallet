const COINGECKO_IDS = 'avalanche-2,ethereum,usd-coin,trader-joe-2';
const URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd`;

/**
 * Fetches USD prices for AVAX, ETH, USDC, and JOE from CoinGecko.
 * @returns {Promise<{[id: string]: {usd: number}}>}
 */
export async function getTokenPrices() {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json();
}
