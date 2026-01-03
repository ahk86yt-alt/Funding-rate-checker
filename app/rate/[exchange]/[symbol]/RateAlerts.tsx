'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AuthBox from '@/app/components/AuthBox';

type Direction = 'above' | 'below';

type AlertRow = {
  id: string;
  exchange: string;
  symbol: string;
  direction: Direction;
  threshold: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastSentAt?: string | null;
  lastSentRate?: number | null;
};

type MeRes =
  | { user: { id: string; email: string } }
  | { error: string };

function fmtDir(d: Direction) {
  return d === 'above' ? '以上' : '以下';
}
function fmtTh(v: number) {
  if (!Number.isFinite(v)) return '-';
  return `${v.toFixed(4)}%`;
}
function fmtDateTime(v?: string | null) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
}
function triggerLabel(a: AlertRow) {
  return a.lastSentAt ? 'トリガー済み' : '未トリガー';
}

export default function RateAlerts() {
  const params = useParams<{ exchange?: string; symbol?: string }>();
  const exchange = String(params?.exchange ?? '').toLowerCase();
  const symbol = String(params?.symbol ?? '').toUpperCase();

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const [direction, setDirection] = useState<Direction>('above');
  const [threshold, setThreshold] = useState<string>('0.0100');

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as MeRes | null;
        if (r.ok && j && 'user' in j) return j.user;
        return null;
      })
      .then((u) => setUser(u))
      .finally(() => setMeLoaded(true));
  }, []);

  const mine = useMemo(() => {
    return alerts.filter((a) => a.exchange.toLowerCase() === exchange && a.symbol.toUpperCase() === symbol);
  }, [alerts, exchange, symbol]);

  async function load() {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('/api/alerts', { cache: 'no-store' });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setAlerts([]);
        setStatus(data?.error ?? `取得に失敗しました（${res.status}）`);
        return;
      }
      setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
    } catch (e: any) {
      setAlerts([]);
      setStatus(e?.message ?? '取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setStatus('');
    try {
      const th = Number(threshold);
      if (!Number.isFinite(th)) {
        setStatus('しきい値が不正です');
        return;
      }

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          exchange,
          symbol,
          direction,
          threshold: th,
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setStatus(data?.error ?? `作成に失敗しました（${res.status}）`);
        return;
      }

      await load();
      setStatus('作成しました');
    } catch (e: any) {
      setStatus(e?.message ?? '作成に失敗しました');
    }
  }

  async function removeOne(id: string) {
    setStatus('');
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setStatus(data?.error ?? `削除に失敗しました（${res.status}）`);
        return;
      }
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      setStatus(e?.message ?? '削除に失敗しました');
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    setStatus('');
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setStatus(data?.error ?? `更新に失敗しました（${res.status}）`);
        return;
      }
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
    } catch (e: any) {
      setStatus(e?.message ?? '更新に失敗しました');
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, exchange, symbol]);

  if (!meLoaded) {
    return <div style={{ fontSize: 13, color: '#6b7280' }}>読み込み中…</div>;
  }

  if (!user) {
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
          アラート設定を使うにはログインしてください。
        </div>
        <AuthBox />
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>アラート設定</div>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800 }}>
            {exchange.toUpperCase()} / {symbol}
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 10,
            background: '#fff',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          一覧を更新
        </button>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px 120px', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800, marginBottom: 6 }}>条件</div>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as Direction)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                background: '#fff',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              <option value="above">しきい値以上になったら通知</option>
              <option value="below">しきい値以下になったら通知</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800, marginBottom: 6 }}>しきい値（%）</div>
            <input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              inputMode="decimal"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                background: '#fff',
                fontSize: 16,
                fontWeight: 900,
              }}
            />
          </div>

          <button
            type="button"
            onClick={create}
            style={{
              height: 48,
              borderRadius: 12,
              border: '1px solid #111827',
              background: '#111827',
              color: '#fff',
              fontSize: 14,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            追加
          </button>
        </div>

        {status ? (
          <div style={{ fontSize: 13, fontWeight: 900, color: status.includes('失敗') ? '#ef4444' : '#16a34a' }}>
            {status}
          </div>
        ) : null}

        <div style={{ fontSize: 12, color: '#6b7280' }}>
          登録数：{mine.length}
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {mine.map((a) => (
            <div
              key={a.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 10,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'grid', gap: 3 }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>
                  条件：{fmtDir(a.direction)} {fmtTh(a.threshold)}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  状態：{a.enabled ? '有効' : '無効'} / {triggerLabel(a)}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  最終トリガー：{fmtDateTime(a.lastSentAt)}{a.lastSentRate != null ? `（${fmtTh(a.lastSentRate)}）` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => toggleEnabled(a.id, !a.enabled)}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 10,
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {a.enabled ? '無効にする' : '有効にする'}
                </button>

                <button
                  type="button"
                  onClick={() => removeOne(a.id)}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid #ef4444',
                    borderRadius: 10,
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 900,
                    color: '#ef4444',
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}

          {!loading && mine.length === 0 ? (
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              この銘柄・取引所のアラートはまだありません。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
