import { NextResponse } from 'next/server';

/**
 * MEXC USDT 無期限 Funding Rate
 * return: { BTCUSDT: number, XRPUSDT: number, ... }
 */
export async function GET() {
  try {
    const res = await fetch(
      'https://contract.mexc.com/api/v1/contract/funding_rate',
      { cache: 'no-store' }
    );

    if (!res.ok) {
      return NextResponse.json({}, { status: 500 });
    }

    const json = await res.json();

    const result: Record<string, number> = {};

    for (const i of json.data ?? []) {
      /**
       * i.symbol 例:
       * BTC_USDT
       * XRP_USDT
       * 1000PEPE_USDT
       */
      if (!i.symbol || i.fundingRate == null) continue;

      const normalizedSymbol = i.symbol.replace('_', '');

      result[normalizedSymbol] = Number(i.fundingRate) * 100;
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
