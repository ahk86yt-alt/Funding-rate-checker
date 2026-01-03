'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AuthBox from '@/app/components/AuthBox';

type AlertRow = {
  id: string;
  exchange: string;
  symbol: string;
  direction: 'above' | 'below';
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

function fmtDir(d: 'above' | 'below') {
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

function fmtTrigger(a: AlertRow) {
  return a.lastSentAt ? 'トリガー済み' : '未トリガー';
}

function toRateUrl(exchange: string, symbol: string) {
  return `/rate/${encodeURIComponent(exchange.toLowerCase())}/${encodeURIComponent(symbol.toUpperCase())}`;
}

export default function AlertsClient() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // filters
  const [q, setQ] = useState('');
  const [onlyEnabled, setOnlyEnabled] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    const kw = q.trim().toUpperCase();
    return alerts.filter((a) => {
      if (onlyEnabled && !a.enabled) return false;
      if (!kw) return true;
      return (
        a.symbol.toUpperCase().includes(kw) ||
        a.exchange.toUpperCase().includes(kw) ||
        `${fmtTrigger(a)} ${fmtDir(a.direction)} ${fmtTh(a.threshold)}`.toUpperCase().includes(kw)
      );
    });
  }, [alerts, q, onlyEnabled]);

  async function patch(id: string, body: any) {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error(data?.error ?? `更新に失敗しました（${res.status}）`);
    return data;
  }

  async function del(id: string) {
    const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error(data?.error ?? `削除に失敗しました（${res.status}）`);
    return data;
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    setStatus('');
    try {
      await patch(id, { enabled });
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
    } catch (e: any) {
      setStatus(e?.message ?? '更新に失敗しました');
    }
  }

  async function removeOne(id: string) {
    setStatus('');
    try {
      await del(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      setStatus(e?.message ?? '削除に失敗しました');
    }
  }

  async function bulkEnable(enabled: boolean) {
    setStatus('');
    const target = filtered;
    if (!target.length) return;

    try {
      for (const a of target) {
        if (a.enabled === enabled) continue;
        // eslint-disable-next-line no-await-in-loop
        await patch(a.id, { enabled });
      }
      setAlerts((prev) => prev.map((a) => (target.some((t) => t.id === a.id) ? { ...a, enabled } : a)));
    } catch (e: any) {
      setStatus(e?.message ?? '一括更新に失敗しました');
    }
  }

  async function bulkDelete() {
    setStatus('');
    const target = filtered;
    if (!target.length) return;

    const ok = window.confirm(`表示中の ${target.length} 件を削除します。よろしいですか？`);
    if (!ok) return;

    try {
      for (const a of target) {
        // eslint-disable-next-line no-await-in-loop
        await del(a.id);
      }
      setAlerts((prev) => prev.filter((a) => !target.some((t) => t.id === a.id)));
    } catch (e: any) {
      setStatus(e?.message ?? '一括削除に失敗しました');
    }
  }

  if (!meLoaded) {
    return <div style={{ fontSize: 13, color: '#6b7280' }}>読み込み中…</div>;
  }

  if (!user) {
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
          アラート管理を使うにはログインしてください。
        </div>
        <AuthBox />
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      {/* filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="検索（例：BTC / BINANCE / トリガー / 以上 / 以下）"
          style={{
            flex: '1 1 260px',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 10,
            background: '#fff',
            fontSize: 14,
            fontWeight: 700,
          }}
        />

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#111827' }}>
          <input
            type="checkbox"
            checked={onlyEnabled}
            onChange={(e) => setOnlyEnabled(e.target.checked)}
          />
          有効のみ
        </label>

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
          更新
        </button>
      </div>

      {/* bulk actions */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => bulkEnable(true)}
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
          表示中を一括有効
        </button>
        <button
          type="button"
          onClick={() => bulkEnable(false)}
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
          表示中を一括無効
        </button>
        <button
          type="button"
          onClick={bulkDelete}
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
          表示中を一括削除
        </button>

        <span style={{ fontSize: 12, color: '#6b7280' }}>
          {loading ? '読み込み中…' : `表示：${filtered.length} / 全体：${alerts.length}`}
        </span>

        {status ? (
          <span style={{ fontSize: 12, color: '#ef4444' }}>{status}</span>
        ) : null}
      </div>

      {/* list */}
      <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
        {filtered.map((a) => (
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
                {a.exchange.toUpperCase()} / {a.symbol.toUpperCase()}
              </div>

              <div style={{ fontSize: 13, color: '#111827' }}>
                条件：{fmtDir(a.direction)} {fmtTh(a.threshold)}
              </div>

              <div style={{ fontSize: 12, color: '#6b7280' }}>
                状態：{a.enabled ? '有効' : '無効'} / {fmtTrigger(a)}
              </div>

              <div style={{ fontSize: 12, color: '#6b7280' }}>
                最終トリガー：{fmtDateTime(a.lastSentAt)}{a.lastSentRate != null ? `（${fmtTh(a.lastSentRate)}）` : ''}
              </div>

              <div style={{ marginTop: 4 }}>
                <Link
                  href={toRateUrl(a.exchange, a.symbol)}
                  style={{ fontSize: 12, color: '#2563eb', fontWeight: 900, textDecoration: 'none' }}
                >
                  このレートページを開く
                </Link>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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

        {!loading && filtered.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            表示できるアラートがありません。
          </div>
        ) : null}
      </div>
    </div>
  );
}
