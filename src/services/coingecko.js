const COINGECKO_IDS = 'avalanche-2,ethereum,usd-coin,trader-joe-2';
const URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd`;

export async function getTokenPrices() {
  try {
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = await res.json();
    console.log('CoinGecko prices:', data);
    return data;
  } catch (e) {
    console.error('CoinGecko failed:', e);
    return {
      'avalanche-2': { usd: 9.19 },
      'ethereum': { usd: 1980.72 },
      'usd-coin': { usd: 1.00 },
      'trader-joe-2': { usd: 0.45 }
    };
  }
}
