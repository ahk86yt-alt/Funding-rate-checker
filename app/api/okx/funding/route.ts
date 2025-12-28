import { NextResponse } from 'next/server';

/**
 * OKX USDT 無期限 Funding Rate
 * return: { BTCUSDT: number, ETHUSDT: number, ... }
 */
export async function GET() {
  try {
    // ① USDT 無期限 SWAP 銘柄一覧
    const listRes = await fetch(
      'https://www.okx.com/api/v5/public/instruments?instType=SWAP',
      {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
        },
      }
    );

    if (!listRes.ok) {
      return NextResponse.json({}, { status: 500 });
    }

    const listJson = await listRes.json();

    const result: Record<string, number> = {};

    // ② 各 instId ごとに funding-rate を取得
    for (const inst of listJson.data ?? []) {
      /**
       * inst.instId 例:
       * BTC-USDT-SWAP
       * ETH-USDT-SWAP
       */
      if (!inst.instId || !inst.instId.endsWith('-USDT-SWAP')) continue;

      try {
        const rateRes = await fetch(
          `https://www.okx.com/api/v5/public/funding-rate?instId=${inst.instId}`,
          {
            cache: 'no-store',
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
            },
          }
        );

        if (!rateRes.ok) continue;

        const rateJson = await rateRes.json();
        const item = rateJson.data?.[0];

        if (!item || item.fundingRate == null) continue;

        const symbol =
          inst.instId.replace('-USDT-SWAP', '') + 'USDT';

        result[symbol] = Number(item.fundingRate) * 100;
      } catch {
        // 個別失敗は無視（OKXでは普通）
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
