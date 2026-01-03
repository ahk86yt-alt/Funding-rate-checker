'use client';

import { useParams } from 'next/navigation';
import RateChart from './RateChart';
import RateAlerts from './RateAlerts';

type Exchange =
  | 'binance'
  | 'okx'
  | 'bybit'
  | 'kucoin'
  | 'mexc'
  | 'gate'
  | 'bitget';

export default function RateClient() {
  const params = useParams() as {
    exchange?: string | string[];
    symbol?: string | string[];
  };

  const exchangeRaw = Array.isArray(params.exchange) ? params.exchange[0] : params.exchange;
  const symbolRaw = Array.isArray(params.symbol) ? params.symbol[0] : params.symbol;

  const exchange = (exchangeRaw ?? '').toLowerCase();
  const symbol = (symbolRaw ?? '').toUpperCase();

  if (!exchange || !symbol) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>無効なURLです</div>
        <div style={{ color: '#6b7280', fontSize: 13 }}>
          exchange / symbol が取得できませんでした。
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <RateChart exchange={exchange as Exchange} symbol={symbol} />
      <RateAlerts exchange={exchange as Exchange} symbol={symbol} />
    </div>
  );
}
