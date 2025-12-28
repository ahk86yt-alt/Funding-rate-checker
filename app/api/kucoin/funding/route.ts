import { NextResponse } from 'next/server';

export async function GET() {
  const result: Record<string, number> = {};

  try {
    // ① 契約一覧（USDT無期限）
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

    if (!listRes.ok) {
      return NextResponse.json({});
    }

    const listJson = await listRes.json();
    const contracts = Array.isArray(listJson?.data) ? listJson.data : [];

    // ② 各銘柄の Funding Rate
    for (const c of contracts) {
      if (c.quoteCurrency !== 'USDT') continue;

      const symbolM = c.symbol; // BTCUSDTM
      if (!symbolM) continue;

      try {
        const frRes = await fetch(
          `https://api-futures.kucoin.com/api/v1/funding-rate/${symbolM}/current`,
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

        // BTCUSDTM → BTCUSDT
        const key = symbolM.replace('M', '');

        result[key] = Number(rate) * 100;
      } catch {}
    }
  } catch {}

  return NextResponse.json(result);
}
