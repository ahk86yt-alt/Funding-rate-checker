import { NextResponse } from 'next/server';

/**
 * CoinGecko Market Cap
 * BTC, ETH, SOL など → 時価総額
 */
export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets' +
        '?vs_currency=usd' +
        '&order=market_cap_desc' +
        '&per_page=250' +
        '&page=1' +
        '&sparkline=false',
      { cache: 'no-store' }
    );

    if (!res.ok) {
      return NextResponse.json({}, { status: 500 });
    }

    const json = await res.json();
    const map: Record<string, number> = {};

    for (const c of json) {
      // BTC → BTCUSDT に合わせる
      const symbol = c.symbol.toUpperCase() + 'USDT';
      map[symbol] = c.market_cap;
    }

    return NextResponse.json(map);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
