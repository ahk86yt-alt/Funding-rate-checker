'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type AlertDirection = 'above' | 'below';

type FundingAlert = {
  key: string; // exchange:symbol
  threshold: number;
  direction: AlertDirection;
  enabled: boolean;
  lastTriggeredAt?: number;
};

function loadAlerts(): Record<string, FundingAlert> {
  const raw = localStorage.getItem('fundingAlerts');
  if (!raw) return {};
  try {
    return JSON.parse(raw) ?? {};
  } catch {
    return {};
  }
}

function saveAlerts(map: Record<string, FundingAlert>) {
  localStorage.setItem('fundingAlerts', JSON.stringify(map));
}

function parseKey(key: string): { exchange: string; symbol: string } {
  const [exchange, ...rest] = key.split(':');
  return { exchange: exchange ?? '', symbol: rest.join(':') ?? '' };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Record<string, FundingAlert>>({});
  const [query, setQuery] = useState('');

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  const list = useMemo(() => {
    const arr = Object.values(alerts);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? arr.filter(a => {
          const { exchange, symbol } = parseKey(a.key);
          return (
            a.key.toLowerCase().includes(q) ||
            exchange.toLowerCase().includes(q) ||
            symbol.toLowerCase().includes(q)
          );
        })
      : arr;

    // enabled → 上、更新日時の新しい順
    return filtered.sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return (b.lastTriggeredAt ?? 0) - (a.lastTriggeredAt ?? 0);
    });
  }, [alerts, query]);

  const update = (key: string, patch: Partial<FundingAlert>) => {
    setAlerts(prev => {
      const next = { ...prev };
      const cur = next[key];
      if (!cur) return prev;
      next[key] = { ...cur, ...patch };
      saveAlerts(next);
      return next;
    });
  };

  const remove = (key: string) => {
    setAlerts(prev => {
      const next = { ...prev };
      delete next[key];
      saveAlerts(next);
      return next;
    });
  };

  const disableAll = () => {
    setAlerts(prev => {
      const next: Record<string, FundingAlert> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k] = { ...v, enabled: false };
      }
      saveAlerts(next);
      return next;
    });
  };

  const clearAll = () => {
    if (!confirm('すべてのアラートを削除します。よろしいですか？')) return;
    localStorage.removeItem('fundingAlerts');
    setAlerts({});
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>アラート管理</h1>
        <div style={{ color: '#6b7280', fontSize: 12 }}>
          {list.length} 件
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={disableAll} style={btn}>
            全て無効化
          </button>
          <button onClick={clearAll} style={btnDanger}>
            全削除
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: '#374151' }}>検索</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="BTC / binance / bybit..."
          style={input}
        />
        {query.trim() && (
          <button onClick={() => setQuery('')} style={btn}>
            クリア
          </button>
        )}
        <Link href="/" style={{ marginLeft: 'auto', fontSize: 12, color: '#2563eb' }}>
          ← 一覧へ戻る
        </Link>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr>
              <th style={th}>取引所</th>
              <th style={th}>銘柄</th>
              <th style={th}>条件</th>
              <th style={th}>閾値（%）</th>
              <th style={th}>有効</th>
              <th style={th}>最終発火</th>
              <th style={th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map(a => {
              const { exchange, symbol } = parseKey(a.key);
              const last =
                a.lastTriggeredAt
                  ? new Date(a.lastTriggeredAt).toLocaleString()
                  : '—';

              return (
                <tr key={a.key}>
                  <td style={tdMono}>{exchange.toUpperCase()}</td>
                  <td style={tdMono}>{symbol}</td>

                  <td style={td}>
                    <select
                      value={a.direction}
                      onChange={e =>
                        update(a.key, { direction: e.target.value as any })
                      }
                      style={select}
                    >
                      <option value="below">以下</option>
                      <option value="above">以上</option>
                    </select>
                  </td>

                  <td style={td}>
                    <input
                      type="number"
                      value={String(a.threshold)}
                      onChange={e =>
                        update(a.key, {
                          threshold: Number(e.target.value),
                        })
                      }
                      style={num}
                    />
                  </td>

                  <td style={td}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={a.enabled}
                        onChange={e => update(a.key, { enabled: e.target.checked })}
                      />
                      {a.enabled ? 'ON' : 'OFF'}
                    </label>
                  </td>

                  <td style={td}>{last}</td>

                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link
                        href={`/chart?exchange=${exchange}&symbol=${symbol}`}
                        style={linkBtn}
                      >
                        チャートへ
                      </Link>
                      <button onClick={() => remove(a.key)} style={btnDanger}>
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {list.length === 0 && (
              <tr>
                <td style={td} colSpan={7}>
                  アラートがありません。チャート画面で「資金調達率アラート」を保存してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: '#6b7280' }}>
        注: アラートの監視と通知は「チャート画面を開いている間」に動作します。
        （次段で、どのページでも監視できる常駐型にできます）
      </div>
    </div>
  );
}

/* ===== Styles ===== */

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 700,
  background: '#fafafa',
};

const td: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid #e5e7eb',
  verticalAlign: 'top',
};

const tdMono: React.CSSProperties = {
  ...td,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

const input: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  fontSize: 13,
  width: 220,
};

const select: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  fontSize: 13,
};

const num: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  fontSize: 13,
  width: 120,
};

const btn: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12,
};

const btnDanger: React.CSSProperties = {
  ...btn,
  border: '1px solid #fecaca',
  background: '#fff',
  color: '#b91c1c',
};

const linkBtn: React.CSSProperties = {
  display: 'inline-block',
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  background: '#fff',
  fontWeight: 700,
  fontSize: 12,
  color: '#2563eb',
  textDecoration: 'none',
};
