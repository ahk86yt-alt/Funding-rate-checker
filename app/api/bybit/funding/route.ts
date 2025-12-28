import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://api.bybit.com/v5/market/tickers?category=linear',
      {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({}, { status: 500 });
    }

    const json = await res.json();

    const result: Record<string, number> = {};

    for (const i of json.result?.list ?? []) {
      /**
       * i.symbol: BTCUSDT
       * i.fundingRate: "0.0001"
       */
      if (!i.symbol || i.fundingRate == null) continue;

      result[i.symbol] = Number(i.fundingRate) * 100;
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({}, { status: 500 });
  }
}
