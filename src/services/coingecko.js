const COINGECKO_IDS = 'bitcoin,ethereum,ripple,solana,avalanche-2,dogecoin,shiba-inu,cardano';
const URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd`;

export async function getTokenPrices() {
  try {
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('CoinGecko failed:', e);
    return {
      'bitcoin':     { usd: 97000 },
      'ethereum':    { usd: 3500 },
      'ripple':      { usd: 0.52 },
      'solana':      { usd: 185 },
      'avalanche-2': { usd: 28 },
      'dogecoin':    { usd: 0.18 },
      'shiba-inu':   { usd: 0.000022 },
      'cardano':     { usd: 0.45 },
    };
  }
}
