import { NextResponse } from 'next/server';
import { fetchBinanceOI, fetchBybitOI } from '@/app/lib/oi';

async function safe(
  fn: () => Promise<Record<string, number>>
): Promise<Record<string, number>> {
  try {
    const res = await fn();
    return res && typeof res === 'object' ? res : {};
  } catch {
    return {};
  }
}

export async function GET() {
  const oiByExchange = {
    binance: await safe(fetchBinanceOI),
    bybit: await safe(fetchBybitOI),
  };

  // symbol union
  const symbolSet = new Set<string>();
  Object.values(oiByExchange).forEach(m =>
    Object.keys(m).forEach(s => symbolSet.add(s))
  );

  return NextResponse.json({
    symbols: Array.from(symbolSet),
    oi: oiByExchange,
  });
}
