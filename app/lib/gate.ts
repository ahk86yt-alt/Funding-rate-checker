import { normalizeSymbol } from './normalizeSymbol';

export async function fetchGateFundingRates() {
  const res = await fetch('https://api.gateio.ws/api/v4/futures/usdt/contracts');
  const json = await res.json();

  const result: Record<string, number> = {};
  json.forEach((c: any) => {
    const key = normalizeSymbol(c.name);
    result[key] = Number(c.funding_rate) * 100;
  });

  return result;
}
