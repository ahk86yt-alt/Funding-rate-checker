/**
 * Funding Rate fetchers
 * 単位：%（例 0.0123%）
 * Symbol 正規化：BTCUSDT 形式
 */

'use server';

import { normalizeSymbol } from './normalizeSymbol';
import { headers } from 'next/headers';

/* =========================
   Binance（USDT無期限）
   ========================= */
export async function fetchBinanceFundingRates(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  try {
    const res = await fetch(
      'https://fapi.binance.com/fapi/v1/premiumIndex',
      { cache: 'no-store' }
    );
    if (!res.ok) return map;

    const json = await res.json();
    if (!Array.isArray(json)) return map;

    for (const i of json) {
      if (!i?.symbol || i.lastFundingRate == null) continue;
      const key = normalizeSymbol(i.symbol);
      map[key] = Number(i.lastFundingRate) * 100;
    }
  } catch {}
  return map;
}

/* =========================
   Bitget（USDT無期限）
   ========================= */
export async function fetchBitgetFundingRates(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  try {
    const res = await fetch(
      'https://api.bitget.com/api/v2/mix/market/current-fund-rate?productType=USDT-FUTURES',
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

/* =========================
   MEXC（USDT無期限）
   ========================= */
export async function fetchMexcFundingRates(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  try {
    const res = await fetch(
      'https://contract.mexc.com/api/v1/contract/funding_rate',
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
/* =========================
   OKX（USDT無期限）【安定版】
   ========================= */
export async function fetchOkxFundingRates(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  try {
    // ① USDT-SWAP 一覧取得
    const listRes = await fetch(
      'https://www.okx.com/api/v5/public/instruments?instType=SWAP',
      { cache: 'no-store' }
    );

    if (!listRes.ok) return result;

    const listJson = await listRes.json();
    const instruments = Array.isArray(listJson?.data) ? listJson.data : [];

    for (const inst of instruments) {
      // BTC-USDT-SWAP
      if (!inst.instId || !inst.instId.endsWith('-USDT-SWAP')) continue;

      const instId = inst.instId;

      try {
        // ② 個別 funding rate
        const frRes = await fetch(
          `https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`,
          { cache: 'no-store' }
        );

        if (!frRes.ok) continue;

        const frJson = await frRes.json();
        const data = frJson?.data?.[0];
        if (!data?.fundingRate) continue;

        // BTC-USDT-SWAP → BTCUSDT
        const key = instId.replace('-USDT-SWAP', 'USDT');

        result[key] = Number(data.fundingRate) * 100;
      } catch {}
    }
  } catch {}

  return result;
}

/* =========================
   Bybit（USDT無期限）
   ========================= */
export async function fetchBybitFundingRates(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  try {
    const res = await fetch(
      'https://api.bybit.com/v5/market/tickers?category=linear',
      { cache: 'no-store' }
    );
    if (!res.ok) return map;

    const json = await res.json();
    const list = Array.isArray(json?.result?.list) ? json.result.list : [];

    for (const i of list) {
      if (!i?.symbol || i.fundingRate == null) continue;
      const key = normalizeSymbol(i.symbol);
      map[key] = Number(i.fundingRate) * 100;
    }
  } catch {}
  return map;
}

/* =========================
   KuCoin（USDT無期限）
   ========================= */
export async function fetchKucoinFundingRates(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  try {
    // ① USDT無期限 契約一覧
    const listRes = await fetch(
      'https://api-futures.kucoin.com/api/v1/contracts/active',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!listRes.ok) return result;

    const listJson = await listRes.json();
    const contracts = Array.isArray(listJson?.data) ? listJson.data : [];

    for (const c of contracts) {
      if (c.quoteCurrency !== 'USDT') continue;

      const rawSymbol = c.symbol; // XBTUSDTM
      if (!rawSymbol) continue;

      try {
        const frRes = await fetch(
          `https://api-futures.kucoin.com/api/v1/funding-rate/${rawSymbol}/current`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
            },
            cache: 'no-store',
          }
        );

        if (!frRes.ok) continue;

        const frJson = await frRes.json();
        const rate = frJson?.data?.value;
        if (rate == null) continue;

        // ★ 正規化は normalizeSymbol に完全委譲
        const key = normalizeSymbol(rawSymbol);
        if (!key) continue;

        result[key] = Number(rate) * 100;
      } catch {}
    }
  } catch {}

  return result;
}

/* =========================
   Market Cap
   ========================= */
export async function fetchMarketCaps(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets' +
        '?vs_currency=usd&order=market_cap_desc&per_page=250&page=1',
      { cache: 'no-store' }
    );
    if (!res.ok) return map;

    const json = await res.json();
    if (!Array.isArray(json)) return map;

    for (const c of json) {
      if (!c?.symbol || c.market_cap == null) continue;
      map[`${c.symbol.toUpperCase()}USDT`] = c.market_cap;
    }
  } catch {}
  return map;
}
/* =========================
   Gate（USDT無期限）
   ========================= */
export async function fetchGateFundingRates(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};

  try {
    const res = await fetch(
      'https://api.gateio.ws/api/v4/futures/usdt/contracts',
      {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }
    );
    if (!res.ok) return map;

    const list = await res.json();
    if (!Array.isArray(list)) return map;

    for (const i of list) {
      if (!i?.name || i.funding_rate == null) continue;
      const key = normalizeSymbol(i.name);
      map[key] = Number(i.funding_rate) * 100;
    }
  } catch {}

  return map;
}
