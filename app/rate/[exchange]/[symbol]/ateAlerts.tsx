'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthBox from '@/app/components/AuthBox';

type Exchange =
  | 'binance'
  | 'okx'
  | 'bybit'
  | 'kucoin'
  | 'mexc'
  | 'gate'
  | 'bitget';

type AlertRow = {
  id: string;
  exchange: string;
  symbol: string;
  direction: 'above' | 'below';
  threshold: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type MeRes =
  | { user: { id: string; email: string } }
  | { error: string };

function fmtDir(d: 'above' | 'below') {
  return d === 'above' ? '以上' : '以下';
}

function fmtTh(v: number) {
  if (!Number.isFinite(v)) return '-';
  return `${v.toFixed(4)}%`;
}

export default function RateAlerts({
  exchange,
  symbol,
}: {
  exchange: Exchange;
  symbol: string;
}) {
  const ex = useMemo(() => String(exchange).toLowerCase(), [exchange]);
  const sym = useMemo(() => String(symbol).toUpperCase(), [symbol]);

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // form
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState<string>('0.0100'); // %（例）

  // ログイン確認
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

  async function load() {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch(`/api/alerts?exchange=${encodeURIComponent(ex)}&symbol=${encodeURIComponent(sym)}`, {
        cache: 'no-store',
      });
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

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, ex, sym]);

  async function createAlert() {
    setStatus('');
    const th = Number(threshold);
    if (!Number.isFinite(th)) {
      setStatus('しきい値が数値ではありません');
      return;
    }

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          exchange: ex,
          symbol: sym,
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

  async function removeAlert(id: string) {
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

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <div>
          <div style={{ fontWeight: 900 }}>アラート設定</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {ex.toUpperCase()} / {sym}
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={!user || loading}
          style={{
            padding: '8px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 10,
            background: '#fff',
            cursor: user ? 'pointer' : 'not-allowed',
            fontSize: 12,
            fontWeight: 900,
            opacity: user ? 1 : 0.5,
          }}
        >
          一覧を更新
        </button>
      </div>

      {!meLoaded ? (
        <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>読み込み中…</div>
      ) : !user ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
            アラート設定を使うにはログインしてください。
          </div>
          <AuthBox />
        </div>
      ) : (
        <>
          {/* 追加フォーム（このページの exchange/symbol に固定） */}
          <div
            style={{
              marginTop: 12,
              display: 'grid',
              gap: 10,
              gridTemplateColumns: '1fr 1fr auto',
              alignItems: 'end',
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>条件</div>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'above' | 'below')}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: 10,
                  background: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <option value="above">しきい値以上になったら通知</option>
                <option value="below">しきい値以下になったら通知</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>しきい値（%）</div>
              <input
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                inputMode="decimal"
                placeholder="例：0.0100"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: 10,
                  background: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              />
            </div>

            <button
              type="button"
              onClick={createAlert}
              style={{
                padding: '10px 12px',
                border: '1px solid #111827',
                borderRadius: 10,
                background: '#111827',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}
            >
              追加
            </button>
          </div>

          {status ? (
            <div style={{ marginTop: 10, fontSize: 12, color: status.includes('失敗') ? '#ef4444' : '#111827' }}>
              {status}
            </div>
          ) : null}

          {/* 一覧 */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              {loading ? '読み込み中…' : `登録数：${alerts.length}`}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {alerts.map((a) => (
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
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>
                      {fmtDir(a.direction)} {fmtTh(a.threshold)}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      状態：{a.enabled ? '有効' : '無効'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                      onClick={() => removeAlert(a.id)}
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

              {!loading && alerts.length === 0 ? (
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  この銘柄・取引所のアラートはまだありません。
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
