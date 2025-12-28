/**
 * BingX Funding Rate
 * USDT Perpetual
 */

import { normalizeSymbol } from './normalizeSymbol';

export async function fetchBingxFundingRates(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};

  try {
    const res = await fetch(
      'https://open-api.bingx.com/openApi/swap/v2/quote/fundingRate',
      { cache: 'no-store' }
    );
    if (!res.ok) return map;

    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];

    for (const i of list) {
      if (!i?.symbol || i.fundingRate == null) continue;
      const key = normalizeSymbol(i.symbol);
      map[key] = Number(i.fundingRate) * 100;
    }
  } catch {}

  return map;
}
