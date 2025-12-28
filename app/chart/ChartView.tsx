
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
} from 'lightweight-charts';

import { fetchBinanceKlines } from '@/app/lib/binance';
import {
  fetchBinanceFundingRates,
  fetchBitgetFundingRates,
  fetchMexcFundingRates,
  fetchOkxFundingRates,
  fetchBybitFundingRates,
} from '@/app/lib/fundingRate';

type Props = {
  exchange: string;
  symbol: string;
};

type AlertDirection = 'above' | 'below';

type FundingAlert = {
  key: string; // exchange:symbol
  threshold: number; // %
  direction: AlertDirection;
  enabled: boolean;
  lastTriggeredAt?: number; // epoch ms
};

const TIMEFRAMES = [
  { label: '1分', value: '1m' },
  { label: '5分', value: '5m' },
  { label: '15分', value: '15m' },
  { label: '1時間', value: '1h' },
  { label: '4時間', value: '4h' },
  { label: '1日', value: '1d' },
] as const;

type Timeframe = (typeof TIMEFRAMES)[number]['value'];

const CHECK_INTERVAL_MS = 10_000; // 10秒
const COOLDOWN_MS = 10 * 60 * 1000; // 10分

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

async function fetchFundingRateByExchange(
  exchange: string,
  symbol: string
): Promise<number | null> {
  // 各fetchは「Record<symbol, number>（%）」を返す前提
  switch (exchange) {
    case 'binance': {
      const m = await fetchBinanceFundingRates();
      return m[symbol] ?? null;
    }
    case 'bitget': {
      const m = await fetchBitgetFundingRates();
      return m[symbol] ?? null;
    }
    case 'mexc': {
      const m = await fetchMexcFundingRates();
      return m[symbol] ?? null;
    }
    case 'okx': {
      const m = await fetchOkxFundingRates();
      return m[symbol] ?? null;
    }
    case 'bybit': {
      const m = await fetchBybitFundingRates();
      return m[symbol] ?? null;
    }
    default:
      return null;
  }
}

function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

async function ensureNotifyPermission(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const p = await Notification.requestPermission();
    return p === 'granted';
  } catch {
    return false;
  }
}

function fireAlertMessage(params: {
  exchange: string;
  symbol: string;
  rate: number;
  direction: AlertDirection;
  threshold: number;
}) {
  const msg = `【資金調達率アラート】
取引所: ${params.exchange.toUpperCase()}
銘柄: ${params.symbol}
現在: ${params.rate.toFixed(4)}%
条件: ${params.direction === 'below' ? '以下' : '以上'} ${params.threshold}%`;

  // OS通知（許可あり）→ それ以外は alert
  if (canNotify() && Notification.permission === 'granted') {
    try {
      new Notification('資金調達率アラート', {
        body: msg,
        silent: false,
      });
      return;
    } catch {
      // fallthrough
    }
  }
  alert(msg);
}

export default function ChartView({ exchange, symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [loading, setLoading] = useState(false);
  const [ohlc, setOhlc] = useState('—');

  // Funding表示（現在値）
  const [fundingNow, setFundingNow] = useState<number | null>(null);
  const [fundingUpdatedAt, setFundingUpdatedAt] = useState<number | null>(null);

  /* ===== 資金調達率アラート ===== */
  const alertKey = `${exchange}:${symbol}`;
  const [threshold, setThreshold] = useState('');
  const [direction, setDirection] = useState<AlertDirection>('below');
  const [enabled, setEnabled] = useState(false);

  const title = useMemo(
    () => `${exchange.toUpperCase()} / ${symbol.toUpperCase()} / ${timeframe}`,
    [exchange, symbol, timeframe]
  );

  /* ===== チャート初期化（1回のみ） ===== */
  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.offsetWidth || 800,
      height: 520,
      layout: { background: { color: '#ffffff' }, textColor: '#111827' },
      grid: {
        vertLines: { color: '#eeeeee' },
        horzLines: { color: '#eeeeee' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      crosshair: { mode: 1 },
    });

    chartRef.current = chart;

    const series = chart.addCandlestickSeries({
      upColor: '#16a34a',
      downColor: '#ef4444',
      wickUpColor: '#16a34a',
      wickDownColor: '#ef4444',
      borderVisible: false,
    });

    seriesRef.current = series as unknown as ISeriesApi<'Candlestick'>;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.offsetWidth || 800,
      });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  /* ===== ローソク足取得 ===== */
  useEffect(() => {
    const run = async () => {
      if (!seriesRef.current || !chartRef.current) return;

      setLoading(true);
      try {
        // ローソク足は現状 Binance を使用（今後拡張）
        const data = await fetchBinanceKlines(symbol, timeframe);
        seriesRef.current.setData(data as CandlestickData<Time>[]);
        chartRef.current.timeScale().fitContent();
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [exchange, symbol, timeframe]);

  /* ===== クロスヘア OHLC ===== */
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const chart = chartRef.current;
    const series = seriesRef.current;

    const handler = (param: any) => {
      if (!param?.time) {
        setOhlc('—');
        return;
      }

      const p = param.seriesData?.get(series) as
        | CandlestickData<Time>
        | undefined;

      if (!p) {
        setOhlc('—');
        return;
      }

      setOhlc(
        `始値 ${fmt(p.open)}  高値 ${fmt(p.high)}  安値 ${fmt(p.low)}  終値 ${fmt(
          p.close
        )}`
      );
    };

    chart.subscribeCrosshairMove(handler);
    return () => chart.unsubscribeCrosshairMove(handler);
  }, [timeframe]);

  /* ===== アラート読み込み（銘柄/取引所が変わったら復元） ===== */
  useEffect(() => {
    const map = loadAlerts();
    const a = map[alertKey];
    if (!a) {
      setThreshold('');
      setDirection('below');
      setEnabled(false);
      return;
    }
    setThreshold(String(a.threshold));
    setDirection(a.direction);
    setEnabled(a.enabled);
  }, [alertKey]);

  /* ===== 有効化時：通知許可（未選択なら確認） ===== */
  useEffect(() => {
    if (!enabled) return;
    // “有効化されたら”許可を取りにいく。拒否されたら alert にフォールバック。
    ensureNotifyPermission().catch(() => {});
  }, [enabled]);

  /* ===== アラート保存 ===== */
  const saveAlert = () => {
    const t = Number(threshold);
    if (!Number.isFinite(t)) {
      alert('数値を正しく入力してください');
      return;
    }

    const map = loadAlerts();
    const prev = map[alertKey];

    map[alertKey] = {
      key: alertKey,
      threshold: t,
      direction,
      enabled,
      lastTriggeredAt: prev?.lastTriggeredAt,
    };

    saveAlerts(map);
    alert('資金調達率アラートを保存しました');
  };

  /* ===== Funding現在値：表示用（10秒ごと） ===== */
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const r = await fetchFundingRateByExchange(exchange, symbol);
        if (cancelled) return;
        setFundingNow(r);
        setFundingUpdatedAt(Date.now());
      } catch {
        if (cancelled) return;
        setFundingNow(null);
      }
    };

    tick();
    const id = setInterval(tick, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [exchange, symbol]);

  /* ===== StepB：定期チェック & 発火（10秒） ===== */
  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(async () => {
      try {
        const rate = await fetchFundingRateByExchange(exchange, symbol);
        if (rate == null) return;

        const map = loadAlerts();
        const a = map[alertKey];
        if (!a || !a.enabled) return;

        const now = Date.now();
        if (a.lastTriggeredAt && now - a.lastTriggeredAt < COOLDOWN_MS) {
          return;
        }

        const hit =
          (a.direction === 'below' && rate <= a.threshold) ||
          (a.direction === 'above' && rate >= a.threshold);

        if (!hit) return;

        fireAlertMessage({
          exchange,
          symbol,
          rate,
          direction: a.direction,
          threshold: a.threshold,
        });

        map[alertKey] = { ...a, lastTriggeredAt: now };
        saveAlerts(map);
      } catch (e) {
        console.error(e);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [enabled, alertKey, exchange, symbol]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ===== ヘッダー ===== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#374151' }}>{ohlc}</div>

          <div style={{ fontSize: 12, color: '#6b7280' }}>
            資金調達率（現在）:{' '}
            <b style={{ color: fundingNow == null ? '#6b7280' : fundingNow >= 0 ? '#16a34a' : '#dc2626' }}>
              {fundingNow == null ? '—' : `${fundingNow.toFixed(4)}%`}
            </b>
            {fundingUpdatedAt && (
              <span style={{ marginLeft: 8 }}>
                更新: {new Date(fundingUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              style={tf.value === timeframe ? btnActive : btn}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 資金調達率アラート ===== */}
      <div style={panel}>
        <div style={{ fontWeight: 700 }}>資金調達率アラート</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={direction}
            onChange={e => setDirection(e.target.value as AlertDirection)}
            style={input}
          >
            <option value="below">以下になったら</option>
            <option value="above">以上になったら</option>
          </select>

          <input
            type="number"
            placeholder="0.05"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
            style={input}
          />

          <span>%</span>

          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
            />
            有効（通知）
          </label>

          <button onClick={saveAlert} style={btnActive}>
            保存
          </button>

          <a href="/alerts" style={{ marginLeft: 'auto', fontSize: 12, color: '#2563eb' }}>
            アラート管理へ →
          </a>
        </div>

        <div style={{ fontSize: 12, color: '#6b7280' }}>
          注: 通知が許可されていない場合は、条件一致時に画面のアラート表示になります。
        </div>
      </div>

      {/* ===== チャート ===== */}
      <div style={{ position: 'relative' }}>
        <div ref={containerRef} style={chartBox} />
        {loading && <div style={overlay}>読み込み中…</div>}
      </div>
    </div>
  );
}

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}

/* ===== Styles ===== */

const btn: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#ffffff',
  cursor: 'pointer',
  fontWeight: 600,
};

const btnActive: React.CSSProperties = {
  ...btn,
  background: '#111827',
  color: '#ffffff',
};

const panel: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 12,
  display: 'grid',
  gap: 8,
};

const input: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  fontSize: 13,
};

const chartBox: React.CSSProperties = {
  width: '100%',
  maxWidth: 1200,
  height: 520,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  overflow: 'hidden',
};

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(255,255,255,0.7)',
  fontWeight: 700,
};
