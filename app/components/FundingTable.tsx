'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SymbolSortMode } from '@/app/page';

type Exchange =
  | 'binance'
  | 'okx'
  | 'bybit'
  | 'kucoin'
  | 'mexc'
  | 'gate'
  | 'bitget';

type FundingMap = Record<Exchange, Record<string, number>>;

type ApiRes = {
  symbols: string[];
  funding: FundingMap;
  errors?: Record<string, string>;
};

type MarketCapRes =
  | { caps: Record<string, number> }
  | { marketCaps: Record<string, number> }
  | { data: Array<{ symbol: string; marketCap?: number; cap?: number }> }
  | Record<string, number>
  | any;

const EXCHANGES: { key: Exchange; label: string; icon?: string }[] = [
  { key: 'binance', label: 'Binance', icon: '/exchanges/binance.svg' },
  { key: 'okx', label: 'OKX', icon: '/exchanges/okx.svg' },
  { key: 'bybit', label: 'Bybit', icon: '/exchanges/bybit.svg' },
  { key: 'kucoin', label: 'KuCoin' },
  { key: 'mexc', label: 'MEXC', icon: '/exchanges/mexc.svg' },
  { key: 'gate', label: 'Gate' },
  { key: 'bitget', label: 'Bitget', icon: '/exchanges/bitget.svg' },
];

const LS_FAVORITES = 'funding:favorites:v1';
const LS_FAVONLY = 'funding:favoritesOnly:v1';
const LS_QUERY = 'funding:searchQuery:v1';

type FavoriteKey = `${Exchange}:${string}`; // exchange:symbol

function fmtRate(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return '-';
  return `${v.toFixed(4)}%`;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function bgForRate(rate: number | null | undefined) {
  if (rate == null || !Number.isFinite(rate)) return '#ffffff';
  const abs = Math.abs(rate);
  const t = clamp01(abs / 0.3);

  const base = rate >= 0 ? [16, 185, 129] : [239, 68, 68];
  const alpha = 0.08 + 0.32 * t;
  return `rgba(${base[0]}, ${base[1]}, ${base[2]}, ${alpha})`;
}

function isPlainObject(x: any) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

function toCapsMap(json: MarketCapRes): Record<string, number> {
  if (!isPlainObject(json)) return {};
  if (isPlainObject(json.caps)) return json.caps as Record<string, number>;
  if (isPlainObject(json.marketCaps)) return json.marketCaps as Record<string, number>;

  if (Array.isArray(json.data)) {
    const m: Record<string, number> = {};
    for (const row of json.data) {
      const sym = String(row?.symbol ?? '').toUpperCase();
      const v = Number(row?.marketCap ?? row?.cap);
      if (sym && Number.isFinite(v)) m[sym] = v;
    }
    return m;
  }

  const entries = Object.entries(json);
  if (entries.length === 0) return {};
  const m: Record<string, number> = {};
  let ok = 0;
  for (const [k, v] of entries) {
    const key = String(k).toUpperCase();
    const num = Number(v);
    if (key && Number.isFinite(num)) {
      m[key] = num;
      ok++;
    }
  }
  return ok > 0 ? m : {};
}

function Star({ filled }: { filled: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        lineHeight: 1,
        fontSize: 14,
        transform: 'translateY(-0.5px)',
        color: filled ? '#111827' : '#9ca3af',
      }}
    >
      {filled ? '★' : '☆'}
    </span>
  );
}

export default function FundingTable({ sortMode }: { sortMode: SymbolSortMode }) {
  const router = useRouter();

  const [data, setData] = useState<ApiRes | null>(null);
  const [caps, setCaps] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // favorites
  const [favorites, setFavorites] = useState<Set<FavoriteKey>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // search
  const [query, setQuery] = useState('');

  // init (LS)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_FAVORITES);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr)) setFavorites(new Set(arr.filter((x) => typeof x === 'string') as FavoriteKey[]));
      }
    } catch {}

    try {
      const raw = localStorage.getItem(LS_FAVONLY);
      if (raw === '1') setFavoritesOnly(true);
    } catch {}

    try {
      const raw = localStorage.getItem(LS_QUERY);
      if (raw) setQuery(String(raw));
    } catch {}
  }, []);

  function persistFavorites(next: Set<FavoriteKey>) {
    setFavorites(next);
    try {
      localStorage.setItem(LS_FAVORITES, JSON.stringify(Array.from(next)));
    } catch {}
  }

  function toggleFavorite(ex: Exchange, sym: string) {
    const key = `${ex}:${sym}` as FavoriteKey;
    const next = new Set(favorites);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persistFavorites(next);
  }

  function isFavorite(ex: Exchange, sym: string) {
    return favorites.has(`${ex}:${sym}` as FavoriteKey);
  }

  function toggleFavoritesOnly() {
    const next = !favoritesOnly;
    setFavoritesOnly(next);
    try {
      localStorage.setItem(LS_FAVONLY, next ? '1' : '0');
    } catch {}
  }

  function onChangeQuery(v: string) {
    const next = v.toUpperCase();
    setQuery(next);
    try {
      localStorage.setItem(LS_QUERY, next);
    } catch {}
  }

  async function loadFunding() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/funding/all', { cache: 'no-store' });
      if (!res.ok) {
        setErr(`fetch failed: ${res.status}`);
        setData(null);
        return;
      }
      const json = (await res.json()) as ApiRes;
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? 'fetch failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadMarketCaps() {
    try {
      const res = await fetch('/api/marketcap', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json().catch(() => null)) as MarketCapRes;
      const m = toCapsMap(json);
      if (m && Object.keys(m).length > 0) setCaps(m);
    } catch {}
  }

  useEffect(() => {
    loadFunding();
  }, []);

  useEffect(() => {
    if (sortMode === 'marketcap') loadMarketCaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  const baseSymbols = useMemo(() => {
    const list = data?.symbols ?? [];

    if (sortMode === 'alpha') {
      return [...list].sort((a, b) => a.localeCompare(b));
    }

    if (!caps || Object.keys(caps).length === 0) return list;

    const withCap = [...list];
    withCap.sort((a, b) => {
      const ca = caps[a.toUpperCase()] ?? -1;
      const cb = caps[b.toUpperCase()] ?? -1;
      if (cb !== ca) return cb - ca;
      return a.localeCompare(b);
    });
    return withCap;
  }, [data, sortMode, caps]);

  // favoritesOnly（symbol行）
  const symbolsAfterFav = useMemo(() => {
    if (!favoritesOnly) return baseSymbols;

    const favSymbolSet = new Set<string>();
    for (const key of favorites) {
      const [, sym] = key.split(':');
      if (sym) favSymbolSet.add(sym);
    }
    return baseSymbols.filter((s) => favSymbolSet.has(s));
  }, [baseSymbols, favoritesOnly, favorites]);

  // search filter（symbol行）
  const symbols = useMemo(() => {
    const q = query.trim();
    if (!q) return symbolsAfterFav;
    return symbolsAfterFav.filter((s) => s.toUpperCase().includes(q));
  }, [symbolsAfterFav, query]);

  const funding = data?.funding;
  const favoriteCount = favorites.size;

  if (loading) return <div style={{ color: '#6b7280', fontSize: 13 }}>loading…</div>;
  if (err) return <div style={{ color: '#ef4444', fontSize: 13 }}>{err}</div>;
  if (!data || !funding) return <div style={{ color: '#6b7280', fontSize: 13 }}>no data</div>;

  return (
    <div>
      {/* controls row */}
      <div
        style={{
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={favoritesOnly} onChange={toggleFavoritesOnly} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>
              お気に入りだけ表示
            </span>
          </label>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>検索</span>
            <input
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="例: BTC / ETH / SOL"
              style={{
                width: 240,
                padding: '7px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
              }}
            />
            {query ? (
              <button
                type="button"
                onClick={() => onChangeQuery('')}
                style={{
                  padding: '7px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: 10,
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#6b7280' }}>
          favorites: <b style={{ color: '#111827' }}>{favoriteCount}</b>
          {'  '} / rows: <b style={{ color: '#111827' }}>{symbols.length}</b>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 980, width: '100%' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#fff',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  fontSize: 13,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                Symbol
              </th>

              {EXCHANGES.map((ex) => (
                <th
                  key={ex.key}
                  style={{
                    textAlign: 'center',
                    padding: '10px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                  title={ex.label}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {ex.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ex.icon} alt={ex.label} width={16} height={16} />
                    ) : null}
                    <span>{ex.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {symbols.map((sym) => (
              <tr key={sym}>
                <td
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f3f4f6',
                    background: '#fff',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    fontWeight: 800,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sym}
                </td>

                {EXCHANGES.map((ex) => {
                  const v = funding?.[ex.key]?.[sym];
                  const fav = isFavorite(ex.key, sym);

                  return (
                    <td
                      key={`${sym}:${ex.key}`}
                      style={{
                        padding: 0,
                        borderBottom: '1px solid #f3f4f6',
                        textAlign: 'center',
                        background: '#fff',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        {/* ★ favorite button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(ex.key, sym);
                          }}
                          title={fav ? 'お気に入り解除' : 'お気に入り'}
                          style={{
                            position: 'absolute',
                            left: 8,
                            top: 8,
                            width: 26,
                            height: 26,
                            borderRadius: 10,
                            border: '1px solid rgba(0,0,0,0.10)',
                            background: 'rgba(255,255,255,0.92)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                          }}
                        >
                          <Star filled={fav} />
                        </button>

                        {/* main cell (navigate) */}
                        <button
                          type="button"
                          onClick={() => router.push(`/rate/${ex.key}/${sym}`)}
                          style={{
                            width: '100%',
                            height: '100%',
                            // ★左上の★と被らないための余白を確保
                            // 左: 44px (★26 + 余白) / 右: 10px
                            padding: '10px 10px 10px 44px',
                            border: 'none',
                            borderRadius: 0,
                            background: bgForRate(v),
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 900,
                            color: '#111827',
                            textAlign: 'right', // ★数値は右寄せ
                            whiteSpace: 'nowrap',
                          }}
                          title={`${ex.label} ${sym} / ${fmtRate(v)}`}
                        >
                          {fmtRate(v)}
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {data.errors && Object.keys(data.errors).length > 0 && (
          <div style={{ padding: 10, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
            {Object.entries(data.errors).map(([k, v]) => (
              <div key={k}>
                {k}: {v}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
