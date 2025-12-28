export async function fetchLbankFundingRates(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};

  const res = await fetch(
    'https://api.lbkex.com/v2/futures/funding_rate',
    { cache: 'no-store' }
  );
  if (!res.ok) return map;

  const json = await res.json();
  const list = Array.isArray(json?.data) ? json.data : [];

  for (const i of list) {
    if (!i?.symbol || i.funding_rate == null) continue;
    const key = normalizeSymbol(i.symbol);
    map[key] = Number(i.funding_rate) * 100;
  }

  return map;
}
