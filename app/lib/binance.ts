import { CandlestickData, Time } from 'lightweight-charts';

const INTERVAL_MAP: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
};

export async function fetchBinanceKlines(
  symbol: string,
  timeframe: string,
  limit = 300
): Promise<CandlestickData<Time>[]> {
  const interval = INTERVAL_MAP[timeframe] ?? '1m';

  const url =
    `https://fapi.binance.com/fapi/v1/klines` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${encodeURIComponent(interval)}` +
    `&limit=${limit}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Binance API error: ${res.status} ${text}`);
  }

  const raw = (await res.json()) as any[];

  return raw.map((k: any) => ({
    time: Math.floor(Number(k[0]) / 1000) as Time,
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}
