import { normalizeSymbol } from './normalizeSymbol';

export async function fetchKucoinFundingRates() {
  const res = await fetch('https://api-futures.kucoin.com/api/v1/contracts/active');
  const json = await res.json();

  const result: Record<string, number> = {};

  await Promise.all(
    json.data.map(async (c: any) => {
      const fr = await fetch(
        `https://api-futures.kucoin.com/api/v1/funding-rate/${c.symbol}/current`
      ).then(r => r.json());

      const key = normalizeSymbol(c.symbol);
      result[key] = Number(fr.data.value) * 100;
    })
  );

  return result;
}
