/**
 * Open Interest fetchers
 * 単位：USD
 */

import { normalizeSymbol } from './normalizeSymbol';

/* =========================
   Binance OI (USDT Perp)
========================= */
export async function fetchBinanceOI(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};

  try {
    const res = await fetch(
      'https://fapi.binance.com/futures/data/openInterestHist?period=5m&limit=1',
      { cache: 'no-store' }
    );
    if (!res.ok) return map;

    const json = await res.json();
    if (!Array.isArray(json)) return map;

    for (const i of json) {
      if (!i?.symbol || !i?.sumOpenInterestValue) continue;
      const key = normalizeSymbol(i.symbol);
      map[key] = Number(i.sumOpenInterestValue);
    }
  } catch {}

  return map;
}

/* =========================
   Bybit OI (USDT Perp)
========================= */
export async function fetchBybitOI(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};

  try {
    const res = await fetch(
      'https://api.bybit.com/v5/market/open-interest?category=linear',
      { cache: 'no-store' }
    );
    if (!res.ok) return map;

    const json = await res.json();
    const list = Array.isArray(json?.result?.list)
      ? json.result.list
      : [];

    for (const i of list) {
      if (!i?.symbol || !i?.openInterestValue) continue;
      const key = normalizeSymbol(i.symbol);
      map[key] = Number(i.openInterestValue);
    }
  } catch {}

  return map;
}
