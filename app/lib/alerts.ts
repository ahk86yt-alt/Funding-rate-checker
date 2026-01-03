// app/lib/alerts.ts
export type Exchange = 'binance' | 'okx' | 'bybit' | 'kucoin' | 'mexc' | 'gate' | 'bitget';

export type FundingMap = Record<Exchange, Record<string, number>>;

export type AlertMode = 'above' | 'below' | 'absAbove';

export type FundingAlert = {
  id: string;
  enabled: boolean;

  exchange: Exchange;
  symbol: string; // normalized (e.g. BTCUSDT)
  mode: AlertMode;

  threshold: number;      // percent (e.g. 0.03 means 0.03%)
  cooldownSec: number;    // minimum seconds between triggers
  oncePerCrossing: boolean;

  note?: string;

  createdAt: number;
  lastTriggeredAt?: number;

  // for crossing logic
  lastValue?: number;
};

const LS_KEY = 'funding_alerts_v1';

export function loadAlerts(): FundingAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: FundingAlert[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(alerts));
}

export function uid(prefix = 'alrt') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function valueForMode(mode: AlertMode, v: number) {
  return mode === 'absAbove' ? Math.abs(v) : v;
}

/**
 * Determine whether alert should trigger.
 * If oncePerCrossing=true:
 *  - above: triggers only when prev < threshold && curr >= threshold
 *  - below: triggers only when prev > threshold && curr <= threshold
 *  - absAbove: triggers when abs(prev) < thr && abs(curr) >= thr
 */
export function shouldTrigger(params: {
  mode: AlertMode;
  threshold: number;
  oncePerCrossing: boolean;
  prev?: number;
  curr: number;
}): boolean {
  const { mode, threshold, oncePerCrossing, prev, curr } = params;

  const currAdj = valueForMode(mode, curr);
  const prevAdj = prev == null ? undefined : valueForMode(mode, prev);

  if (!oncePerCrossing) {
    if (mode === 'below') return currAdj <= threshold;
    return currAdj >= threshold; // above or absAbove
  }

  // crossing logic (needs prev)
  if (prevAdj == null) {
    // Without prev, don't trigger immediately; we "arm" first.
    return false;
  }

  if (mode === 'below') return prevAdj > threshold && currAdj <= threshold;
  return prevAdj < threshold && currAdj >= threshold; // above / absAbove
}

export function getRate(map: FundingMap, exchange: Exchange, symbol: string): number | undefined {
  const ex = map?.[exchange];
  if (!ex) return undefined;
  const v = ex[symbol];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function formatRatePct(v: number) {
  // funding is already in percent
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(4)}%`;
}
