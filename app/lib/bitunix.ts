export async function fetchBitunixFundingRates(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};

  const res = await fetch(
    'https://api.bitunix.com/api/v1/market/funding-rate',
    { cache: 'no-store' }
  );
  if (!res.ok) return map;

  const json = await res.json();
  const list = Array.isArray(json?.data) ? json.data : [];

  for (const i of list) {
    if (!i?.symbol || i.fundingRate == null) continue;
    const key = normalizeSymbol(i.symbol); // BTCUSDT_PERP → BTCUSDT
    map[key] = Number(i.fundingRate) * 100;
  }

  return map;
}
