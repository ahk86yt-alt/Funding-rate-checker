'use client';

import { useEffect, useMemo, useState } from 'react';

type Direction = 'above' | 'below' | 'absAbove';

type AlertRow = {
  id: string;
  exchange: string;
  symbol: string;
  direction: Direction;
  threshold: number;
  enabled: boolean;
  createdAt?: string;
};

export default function AlertPanel({
  defaultExchange,
  defaultSymbol,
}: {
  defaultExchange: string;
  defaultSymbol: string;
}) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const exchange = defaultExchange;
  const symbol = defaultSymbol.toUpperCase();

  const [direction, setDirection] = useState<Direction>('absAbove');
  const [threshold, setThreshold] = useState<number>(0.03);

  async function loadAlerts() {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('/api/alerts', {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data?.alerts) ? data.alerts : [];
      setAlerts(list);
    } catch (e: any) {
      setAlerts([]);
      setStatus(e?.message ?? 'load failed');
    } finally {
      setLoading(false);
    }
  }

  async function createAlert() {
    setStatus('');
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          exchange,
          symbol,
          direction,
          threshold: Number(threshold),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? `create failed (${res.status})`);
        return;
      }
      setStatus('created');
      await loadAlerts();
    } catch (e: any) {
      setStatus(e?.message ?? 'create failed');
    }
  }

  async function toggleEnabled(a: AlertRow) {
    setStatus('');
    const res = await fetch(`/api/alerts/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ enabled: !a.enabled }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.error ?? `toggle failed (${res.status})`);
      return;
    }
    await loadAlerts();
  }

  async function removeAlert(id: string) {
    setStatus('');
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.error ?? `delete failed (${res.status})`);
      return;
    }
    await loadAlerts();
  }

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchange, symbol]);

  const filtered = useMemo(() => {
    const list = Array.isArray(alerts) ? alerts : [];
    return list
      .filter((a) => a.exchange === exchange && a.symbol === symbol)
      .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));
  }, [alerts, exchange, symbol]);

  const label = (d: Direction) => {
    if (d === 'above') return '上回ったら（+側）';
    if (d === 'below') return '下回ったら（-側）';
    return '絶対値が超えたら（おすすめ）';
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 800 }}>Alert</div>
      <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
        {exchange.toUpperCase()} / {symbol}
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 8, maxWidth: 520 }}>
        <label style={{ fontSize: 13 }}>
          条件
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            style={{
              width: '100%',
              marginTop: 4,
              padding: 8,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: '#fff',
            }}
          >
            <option value="absAbove">{label('absAbove')}</option>
            <option value="above">{label('above')}</option>
            <option value="below">{label('below')}</option>
          </select>
        </label>

        <label style={{ fontSize: 13 }}>
          しきい値（%）
          <input
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            inputMode="decimal"
            style={{
              width: '100%',
              marginTop: 4,
              padding: 8,
              border: '1px solid #d1d5db',
              borderRadius: 6,
            }}
          />
        </label>

        <button
          onClick={createAlert}
          disabled={loading}
          style={{
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            background: '#111827',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 800,
          }}
        >
          アラート追加
        </button>

        {status && <div style={{ fontSize: 13, color: '#6b7280' }}>{status}</div>}
      </div>

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>no alerts for this rate</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {filtered.map((a) => (
              <div key={a.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>
                    {label(a.direction)} / {a.threshold}%
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => toggleEnabled(a)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      {a.enabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => removeAlert(a.id)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
