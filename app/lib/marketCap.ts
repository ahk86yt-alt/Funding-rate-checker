type MarketCapMap = Record<string, number>;

export async function fetchMarketCaps(): Promise<MarketCapMap> {
  const map: MarketCapMap = {};

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?' +
        new URLSearchParams({
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: '250',
          page: '1',
          sparkline: 'false',
        }),
      { cache: 'no-store' }
    );

    if (!res.ok) return map;

    const json = await res.json();
    if (!Array.isArray(json)) return map;

    for (const c of json) {
      if (!c.symbol || !c.market_cap) continue;
      map[c.symbol.toUpperCase()] = c.market_cap;
    }
  } catch {}

  return map;
}
