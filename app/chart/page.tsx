'use client';

import { useSearchParams } from 'next/navigation';
import ChartView from './ChartView';

export default function ChartPage() {
  const params = useSearchParams();

  const exchange = params.get('exchange') ?? 'bitget';
  const symbol = params.get('symbol') ?? 'BTCUSDT';

  return (
    <div style={{ padding: 16 }}>
      <h2>{exchange} / {symbol}</h2>
      <ChartView exchange={exchange} symbol={symbol} />
    </div>
  );
}
