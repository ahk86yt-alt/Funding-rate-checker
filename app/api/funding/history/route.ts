import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Exchange =
  | 'binance'
  | 'okx'
  | 'bybit'
  | 'kucoin'
  | 'mexc'
  | 'gate'
  | 'bitget';

type Point = { t: number; v: number };

function okJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toOkxInstId(symbol: string) {
  // アプリは BTCUSDT 形式想定
  // OKX の USDT 無期限は BTC-USDT-SWAP
  if (symbol.endsWith('USDT')) {
    const base = symbol.slice(0, -4);
    return `${base}-USDT-SWAP`;
  }
  if (symbol.endsWith('USD')) {
    const base = symbol.slice(0, -3);
    return `${base}-USD-SWAP`;
  }
  return null;
}

// GET /api/funding/history?exchange=binance&symbol=BTCUSDT&days=1|7|14|30
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const exchange = (url.searchParams.get('exchange') ?? '').toLowerCase() as Exchange;
    const symbol = (url.searchParams.get('symbol') ?? '').toUpperCase();
    const daysRaw = Number(url.searchParams.get('days') ?? '7');

    if (!exchange || !symbol) {
      return okJson('exchange / symbol が必要です');
    }

    const safeDays = [1, 7, 14, 30].includes(daysRaw) ? daysRaw : 7;
    const nowMs = Date.now();
    const sinceMs = nowMs - safeDays * 24 * 60 * 60 * 1000;

    let points: Point[] = [];

    // =========================
    // Binance
    // =========================
    if (exchange === 'binance') {
      const qp = new URLSearchParams({
        symbol,
        startTime: String(sinceMs),
        endTime: String(nowMs),
        limit: '1000',
      });

      const r = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?${qp.toString()}`, {
        cache: 'no-store',
      });

      if (!r.ok) return NextResponse.json({ error: '取引所の履歴取得に失敗しました（Binance）' }, { status: 502 });

      const arr = (await r.json()) as any[];
      points = (Array.isArray(arr) ? arr : [])
        .map((x) => ({
          t: Number(x?.fundingTime),
          // fundingRate は小数（例 0.0001）なので % に変換
          v: Number(x?.fundingRate) * 100,
        }))
        .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
        .sort((a, b) => a.t - b.t);
    }

    // =========================
    // Bybit (v5)
    // =========================
    if (exchange === 'bybit') {
      const qp = new URLSearchParams({
        category: 'linear',
        symbol,
        startTime: String(sinceMs),
        endTime: String(nowMs),
        limit: '200',
      });

      const r = await fetch(`https://api.bybit.com/v5/market/funding/history?${qp.toString()}`, {
        cache: 'no-store',
      });

      if (!r.ok) return NextResponse.json({ error: '取引所の履歴取得に失敗しました（Bybit）' }, { status: 502 });

      const json = await r.json();
      const list = json?.result?.list ?? [];

      points = (Array.isArray(list) ? list : [])
        .map((x: any) => ({
          t: Number(x?.fundingRateTimestamp),
          // fundingRate は小数（例 0.0001）なので % に変換
          v: Number(x?.fundingRate) * 100,
        }))
        .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
        .sort((a, b) => a.t - b.t);
    }

    // =========================
    // OKX (v5 public)
    // =========================
    if (exchange === 'okx') {
      const instId = toOkxInstId(symbol);
      if (!instId) {
        return okJson('OKX の instId に変換できませんでした（例: BTCUSDT / ETHUSDT 形式のみ対応）');
      }

      // OKX は after/before でページング
      const limit = 400;
      let after: string | undefined = undefined;
      const all: any[] = [];

      for (let i = 0; i < 8; i++) {
        const qp = new URLSearchParams({ instId, limit: String(limit) });
        if (after) qp.set('after', after);

        const r = await fetch(`https://www.okx.com/api/v5/public/funding-rate-history?${qp.toString()}`, {
          cache: 'no-store',
        });
        if (!r.ok) break;

        const json = await r.json();
        const data = json?.data ?? [];
        if (!Array.isArray(data) || data.length === 0) break;

        all.push(...data);

        // 次のページ（より古いデータ）を取るため、最も古い fundingTime を after に渡す
        const times = data.map((d: any) => Number(d?.fundingTime)).filter((n: number) => Number.isFinite(n));
        const oldest = Math.min(...times);
        after = String(oldest);

        // すでに十分古いところまで来たら止める
        if (oldest < sinceMs) break;
      }

      points = all
        .map((x: any) => ({
          t: Number(x?.fundingTime),
          // fundingRate は小数（例 0.0001）なので % に変換
          v: Number(x?.fundingRate) * 100,
        }))
        .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
        .filter((p) => p.t >= sinceMs && p.t <= nowMs)
        .sort((a, b) => a.t - b.t);
    }

    // =========================
    // Bitget (v2 mix)
    // =========================
    if (exchange === 'bitget') {
      // Bitget は productType 必須。シンボル末尾でざっくり判定
      const productType =
        symbol.endsWith('USDT') ? 'usdt-futures' :
        symbol.endsWith('USDC') ? 'usdc-futures' :
        'coin-futures';

      const pageSize = 100;
      const all: any[] = [];

      for (let pageNo = 1; pageNo <= 20; pageNo++) {
        const qp = new URLSearchParams({
          symbol,
          productType,
          pageSize: String(pageSize),
          pageNo: String(pageNo),
        });

        const r = await fetch(`https://api.bitget.com/api/v2/mix/market/history-fund-rate?${qp.toString()}`, {
          cache: 'no-store',
        });
        if (!r.ok) break;

        const json = await r.json();
        const data = json?.data ?? [];
        if (!Array.isArray(data) || data.length === 0) break;

        all.push(...data);

        const times = data.map((d: any) => Number(d?.fundingTime)).filter((n: number) => Number.isFinite(n));
        const oldest = Math.min(...times);
        if (oldest < sinceMs) break;
      }

      points = all
        .map((x: any) => ({
          t: Number(x?.fundingTime),
          // fundingRate は小数（例 0.0001）なので % に変換
          v: Number(x?.fundingRate) * 100,
        }))
        .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
        .filter((p) => p.t >= sinceMs && p.t <= nowMs)
        .sort((a, b) => a.t - b.t);
    }

    // 未対応の取引所
    if (!['binance', 'bybit', 'okx', 'bitget'].includes(exchange)) {
      return okJson('この取引所は履歴API未対応です（現状: binance / bybit / okx / bitget のみ対応）');
    }

    const last = points.length ? points[points.length - 1] : null;

    return NextResponse.json({
      exchange,
      symbol,
      days: safeDays,
      points,
      latest: last?.v ?? null,
      updatedAt: last ? new Date(last.t).toISOString() : null,
    });
  } catch (e) {
    console.error('GET /api/funding/history failed:', e);
    return NextResponse.json(
      { error: '履歴の取得でサーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
