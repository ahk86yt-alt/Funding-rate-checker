import { NextResponse } from 'next/server';

/**
 * 明示的に Node.js runtime を使う
 * （Edge runtime 回避）
 */
export const runtime = 'nodejs';

export async function GET() {
  // ★★ ここが最重要（ENV 読み込み確認）
  console.log('[ENV CHECK] CMC_API_KEY =', process.env.CMC_API_KEY);

  const apiKey = process.env.CMC_API_KEY;

  if (!apiKey) {
    console.error('[CMC] API key missing');
    return NextResponse.json(
      { error: 'CMC_API_KEY missing' },
      { status: 500 }
    );
  }

  try {
    const url =
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?' +
      new URLSearchParams({
        start: '1',
        limit: '250',
        convert: 'USD',
      });

    const res = await fetch(url, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const status = res.status;
    const text = await res.text();

    // ---- HTTP エラー ----
    if (!res.ok) {
      console.error('[CMC] HTTP error', status, text);
      return NextResponse.json(
        {
          error: 'CMC request failed',
          status,
          body: text,
        },
        { status }
      );
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[CMC] JSON parse failed', text);
      return NextResponse.json(
        { error: 'Invalid JSON from CMC' },
        { status: 500 }
      );
    }

    // ---- CMC 独自エラー ----
    if (json?.status?.error_code && json.status.error_code !== 0) {
      console.error('[CMC] API error', json.status);
      return NextResponse.json(
        {
          error: 'CMC API error',
          cmc: json.status,
        },
        { status: 502 }
      );
    }

    if (!Array.isArray(json?.data)) {
      console.error('[CMC] Unexpected response shape', json);
      return NextResponse.json(
        { error: 'Unexpected CMC response shape' },
        { status: 500 }
      );
    }

    /**
     * 正常系
     * {
     *   BTC: market_cap,
     *   ETH: market_cap,
     *   SOL: market_cap
     * }
     */
    const map: Record<string, number> = {};

    for (const c of json.data) {
      const symbol = c?.symbol;
      const marketCap = c?.quote?.USD?.market_cap;

      if (!symbol || typeof marketCap !== 'number') continue;
      map[String(symbol).trim().toUpperCase()] = marketCap;
    }

    return NextResponse.json({
      source: 'coinmarketcap',
      count: Object.keys(map).length,
      data: map,
    });
  } catch (err) {
    console.error('[CMC] fetch failed', err);
    return NextResponse.json(
      { error: 'CMC fetch exception' },
      { status: 500 }
    );
  }
}
