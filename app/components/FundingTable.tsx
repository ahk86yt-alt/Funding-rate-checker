'use client';

import { useEffect, useMemo, useState } from 'react';
import FundingHistoryMiniGraph from './FundingHistoryMiniGraph';

/* =====================
   Types
===================== */

type Exchange =
  | 'binance'
  | 'okx'
  | 'bybit'
  | 'kucoin'
  | 'mexc'
  | 'gate'
  | 'bitget';

type FavoriteKey = `${Exchange}:${string}`;
type FundingMap = Record<Exchange, Record<string, number>>;

type Props = {
  sortMode: 'marketcap' | 'alpha';
};

type MeResponse = {
  user?: { id: string; email: string };
};

type Alert = {
  id: string;
  userId: string;
  exchange: string;
  symbol: string;
  direction: 'above' | 'below';
  threshold: number; // % で保存
  enabled: boolean;
};

/* =====================
   Constants
===================== */

const EXCHANGES: { key: Exchange; label: string }[] = [
  { key: 'binance', label: 'Binance' },
  { key: 'okx', label: 'OKX' },
  { key: 'bybit', label: 'Bybit' },
  { key: 'kucoin', label: 'KuCoin' },
  { key: 'mexc', label: 'MEXC' },
  { key: 'gate', label: 'Gate' },
  { key: 'bitget', label: 'Bitget' },
];

/* =====================
   Utils
===================== */

function extractBaseSymbol(symbol: string): string {
  return symbol.replace(/USDT$/i, '');
}

function getFundingBg(rate?: number) {
  if (rate == null) return undefined;
  const abs = Math.abs(rate);
  if (abs >= 0.5) return rate > 0 ? '#dcfce7' : '#fee2e2';
  if (abs >= 0.25) return rate > 0 ? '#ecfdf5' : '#fef2f2';
  return undefined;
}

function formatDate(date: Date) {
  return date.toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/* =====================
   Component
===================== */

export default function FundingTable({ sortMode }: Props) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [fundingByExchange, setFundingByExchange] = useState<FundingMap>({
    binance: {},
    okx: {},
    bybit: {},
    kucoin: {},
    mexc: {},
    gate: {},
    bitget: {},
  });

  const [marketCaps, setMarketCaps] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<FavoriteKey>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [symbolQuery, setSymbolQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // ★ 最終更新時刻
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [enabledExchanges, setEnabledExchanges] = useState<Set<Exchange>>(
    () => new Set(EXCHANGES.map((e) => e.key))
  );

  // ★ ログインユーザー
  const [userId, setUserId] = useState<string | null>(null);

  // ★ アラート一覧
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // ★ 選択中（履歴パネルに出す）
  const [selected, setSelected] = useState<{ exchange: Exchange; symbol: string } | null>(null);

  // ★ 選択中の履歴
  const [historyPoints, setHistoryPoints] = useState<Array<{ t: number; ratePct: number }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ★ アラート入力UI
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');
  const [alertThreshold, setAlertThreshold] = useState<number>(0);

  /* =====================
     Fetch Funding
  ===================== */

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/funding/all', { cache: 'no-store' });
        const json = await res.json();
        setSymbols(json.symbols ?? []);
        setFundingByExchange(json.funding ?? {});
        setLastUpdated(new Date());
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  /* =====================
     Fetch MarketCap (CMC)
  ===================== */

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/marketcap/cmc', { cache: 'no-store' });
      const json = await res.json();
      setMarketCaps(json.data ?? {});
    };
    run();
  }, []);

  /* =====================
     Fetch Me
  ===================== */

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as MeResponse;
      setUserId(json?.user?.id ?? null);
    };
    run();
  }, []);

  /* =====================
     Fetch Alerts
  ===================== */

  const fetchAlerts = async (uid: string) => {
    const res = await fetch(`/api/alerts?userId=${uid}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setAlerts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!userId) {
      setAlerts([]);
      return;
    }
    fetchAlerts(userId);
  }, [userId]);

  /* =====================
     Favorites
  ===================== */

  useEffect(() => {
    const raw = localStorage.getItem('favorites');
    if (!raw) return;
    setFavorites(new Set(JSON.parse(raw)));
  }, []);

  const toggleFavorite = (exchange: Exchange, symbol: string) => {
    const key = `${exchange}:${symbol}` as FavoriteKey;
    const next = new Set(favorites);
    next.has(key) ? next.delete(key) : next.add(key);
    setFavorites(next);
    localStorage.setItem('favorites', JSON.stringify([...next]));
  };

  /* =====================
     Filtering (USDT only)
  ===================== */

  const filteredSymbols = useMemo(() => {
    return symbols.filter((symbol) => {
      if (!symbol.endsWith('USDT')) return false;
      if (symbolQuery && !symbol.toLowerCase().includes(symbolQuery.toLowerCase())) return false;

      if (showFavoritesOnly) {
        return EXCHANGES.some((ex) => favorites.has(`${ex.key}:${symbol}` as FavoriteKey));
      }
      return true;
    });
  }, [symbols, symbolQuery, showFavoritesOnly, favorites]);

  /* =====================
     Sorting
  ===================== */

  const sortedSymbols = useMemo(() => {
    const list = [...filteredSymbols];
    if (sortMode === 'alpha') return list.sort();

    return list.sort((a, b) => {
      const capA = marketCaps[extractBaseSymbol(a)] ?? 0;
      const capB = marketCaps[extractBaseSymbol(b)] ?? 0;
      return capB - capA;
    });
  }, [filteredSymbols, marketCaps, sortMode]);

  const activeExchanges = EXCHANGES.filter((ex) => enabledExchanges.has(ex.key));

  /* =====================
     Helpers (alerts)
  ===================== */

  const findAlert = (exchange: string, symbol: string) => {
    return alerts.find((a) => a.exchange === exchange && a.symbol === symbol) || null;
  };

  const createAlert = async () => {
    if (!userId || !selected) return;

    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        exchange: selected.exchange,
        symbol: selected.symbol,
        direction: alertDirection,
        threshold: alertThreshold,
      }),
    });

    await fetchAlerts(userId);
  };

  const toggleAlertEnabled = async (alertId: string, enabled: boolean) => {
    await fetch(`/api/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (userId) await fetchAlerts(userId);
  };

  const deleteAlert = async (alertId: string) => {
    await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
    if (userId) await fetchAlerts(userId);
  };

  /* =====================
     History Fetch (on select)
  ===================== */

  useEffect(() => {
    const run = async () => {
      if (!selected) return;

      setHistoryLoading(true);
      setHistoryPoints([]);

      try {
        const res = await fetch(
          `/api/funding/history?exchange=${selected.exchange}&symbol=${selected.symbol}&limit=48`,
          { cache: 'no-store' }
        );
        const json = await res.json();
        setHistoryPoints(Array.isArray(json?.points) ? json.points : []);
      } finally {
        setHistoryLoading(false);
      }
    };

    run();
  }, [selected?.exchange, selected?.symbol]);

  // selected が変わったら、UI初期値を「現在値」に寄せる
  useEffect(() => {
    if (!selected) return;
    const current = fundingByExchange[selected.exchange]?.[selected.symbol];
    if (typeof current === 'number') {
      setAlertThreshold(Number(current.toFixed(4)));
      setAlertDirection('above');
    }
  }, [selected?.exchange, selected?.symbol, fundingByExchange]);

  if (loading) return <div>読み込み中…</div>;

  /* =====================
     Render
  ===================== */

  const selectedRate =
    selected ? fundingByExchange[selected.exchange]?.[selected.symbol] : null;

  const selectedAlert = selected
    ? findAlert(selected.exchange, selected.symbol)
    : null;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={controls}>
        <button onClick={() => setShowFavoritesOnly((v) => !v)}>★ お気に入り</button>

        {EXCHANGES.map((ex) => (
          <label key={ex.key}>
            <input
              type="checkbox"
              checked={enabledExchanges.has(ex.key)}
              onChange={() => {
                const next = new Set(enabledExchanges);
                next.has(ex.key) ? next.delete(ex.key) : next.add(ex.key);
                setEnabledExchanges(next);
              }}
            />{' '}
            {ex.label}
          </label>
        ))}

        <div style={searchWrapper}>
          <span style={searchIcon}>🔍</span>
          <input
            value={symbolQuery}
            onChange={(e) => setSymbolQuery(e.target.value)}
            placeholder="Search symbol"
            style={searchInput}
          />
        </div>

        {lastUpdated && <div style={lastUpdatedText}>Last update: {formatDate(lastUpdated)}</div>}
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...th, ...stickyRankHeader }}>{sortMode === 'marketcap' ? '#' : ''}</th>
            <th style={{ ...th, ...stickySymbolHeader }}>Symbol</th>
            {activeExchanges.map((ex) => (
              <th key={ex.key} style={th}>
                {ex.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedSymbols.map((symbol, index) => (
            <tr key={symbol}>
              <td style={{ ...rankCell, ...stickyRankCell }}>
                {sortMode === 'marketcap' ? index + 1 : ''}
              </td>

              <td style={{ ...symbolCell, ...stickySymbolCell }}>{symbol}</td>

              {activeExchanges.map((ex) => {
                const rate = fundingByExchange[ex.key]?.[symbol];
                const fav = favorites.has(`${ex.key}:${symbol}` as FavoriteKey);
                const isSelected = selected?.exchange === ex.key && selected?.symbol === symbol;

                return (
                  <td
                    key={ex.key}
                    style={{
                      ...cell,
                      background: getFundingBg(rate),
                      color:
                        rate == null ? '#9ca3af' : rate >= 0 ? '#16a34a' : '#dc2626',
                      outline: isSelected ? '2px solid #2563eb' : undefined,
                      outlineOffset: isSelected ? '-2px' : undefined,
                    }}
                    onClick={() => setSelected({ exchange: ex.key, symbol })}
                  >
                    {rate == null ? '--' : rate.toFixed(4) + '%'}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(ex.key, symbol);
                      }}
                      style={{
                        marginLeft: 6,
                        cursor: 'pointer',
                        color: fav ? '#facc15' : '#d1d5db',
                      }}
                      title="favorite"
                    >
                      ★
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== 履歴 + アラート UI パネル ===== */}
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>
              {selected ? `${selected.exchange.toUpperCase()} / ${selected.symbol}` : 'セルをクリックすると履歴が表示されます'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Current: {selectedRate == null ? '--' : `${selectedRate.toFixed(4)}%`}
              {selected?.exchange !== 'binance' && selected ? '（履歴は今はBinanceのみ対応）' : ''}
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {userId ? 'ログイン中：アラート設定できます' : 'ログインするとアラート設定できます'}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {selected ? (
            historyLoading ? (
              <div style={{ color: '#6b7280' }}>履歴取得中…</div>
            ) : (
              <FundingHistoryMiniGraph
                points={historyPoints}
                width={760}
                height={200}
                thresholdPct={selectedAlert?.enabled ? selectedAlert.threshold : null}
              />
            )
          ) : null}
        </div>

        {/* アラートUI */}
        {selected && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>アラート（しきい値）</div>

            {!userId ? (
              <div style={{ color: '#6b7280', fontSize: 13 }}>
                アラート作成はログイン後に利用できます。
              </div>
            ) : (
              <>
                {/* 既存アラートがあれば表示 */}
                {selectedAlert ? (
                  <div style={alertExisting}>
                    <div style={{ fontSize: 13 }}>
                      <b>設定済み</b>：{selectedAlert.direction} {selectedAlert.threshold}%　
                      <span style={{ color: selectedAlert.enabled ? '#16a34a' : '#6b7280' }}>
                        [{selectedAlert.enabled ? 'ON' : 'OFF'}]
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => toggleAlertEnabled(selectedAlert.id, selectedAlert.enabled)}>
                        {selectedAlert.enabled ? 'OFFにする' : 'ONにする'}
                      </button>
                      <button onClick={() => deleteAlert(selectedAlert.id)} style={{ color: '#dc2626' }}>
                        削除
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 10 }}>
                    まだアラートがありません。下で作成できます。
                  </div>
                )}

                <div style={alertForm}>
                  <select
                    value={alertDirection}
                    onChange={(e) => setAlertDirection(e.target.value as any)}
                    style={input}
                  >
                    <option value="above">以上になったら</option>
                    <option value="below">以下になったら</option>
                  </select>

                  <input
                    type="number"
                    step="0.0001"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(Number(e.target.value))}
                    style={input}
                  />

                  <button onClick={createAlert}>保存</button>
                </div>

                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                  例：いま -1.6% で「-1.0% になったら知りたい」→ <b>以上 / -1.0</b>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================
   Styles
===================== */

const controls = {
  display: 'flex',
  gap: 12,
  marginBottom: 12,
  flexWrap: 'wrap' as const,
  padding: 12,
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
};

const searchWrapper = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#ffffff',
};

const searchIcon = {
  color: '#9ca3af',
  fontSize: 14,
};

const searchInput = {
  border: 'none',
  outline: 'none',
  fontSize: 14,
  minWidth: 160,
};

const lastUpdatedText = {
  marginLeft: 'auto',
  fontSize: 12,
  color: '#6b7280',
};

const tableStyle = {
  borderCollapse: 'separate' as const,
  borderSpacing: 0,
  minWidth: 1100,
  background: '#ffffff',
  border: '1px solid #e5e7eb',
};

const th = {
  padding: '8px 10px',
  background: '#f3f4f6',
  borderBottom: '1px solid #d1d5db',
  borderRight: '1px solid #e5e7eb',
  fontWeight: 700,
  textAlign: 'center' as const,
  fontSize: 13,
};

const rankCell = {
  padding: '8px 10px',
  textAlign: 'right' as const,
  background: '#f9fafb',
  borderRight: '1px solid #e5e7eb',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 600,
  color: '#6b7280',
  minWidth: 40,
};

const symbolCell = {
  padding: '8px 10px',
  fontWeight: 700,
  background: '#f9fafb',
  borderRight: '1px solid #e5e7eb',
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap' as const,
};

const cell = {
  padding: '8px 10px',
  textAlign: 'right' as const,
  borderBottom: '1px solid #e5e7eb',
  borderRight: '1px solid #f1f5f9',
  cursor: 'pointer',
  fontVariantNumeric: 'tabular-nums' as const,
};

const stickyRankHeader = {
  position: 'sticky' as const,
  left: 0,
  zIndex: 4,
};

const stickyRankCell = {
  position: 'sticky' as const,
  left: 0,
  zIndex: 3,
};

const stickySymbolHeader = {
  position: 'sticky' as const,
  left: 40,
  zIndex: 3,
};

const stickySymbolCell = {
  position: 'sticky' as const,
  left: 40,
  zIndex: 2,
};

const panel = {
  marginTop: 16,
  padding: 14,
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  background: '#ffffff',
};

const alertExisting = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap' as const,
  padding: 10,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#f9fafb',
  marginBottom: 10,
};

const alertForm = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap' as const,
  alignItems: 'center',
};

const input = {
  padding: '6px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#ffffff',
  fontSize: 14,
};
