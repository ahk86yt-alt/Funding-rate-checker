'use client';

import { useEffect, useRef } from 'react';
import {
  fetchBinanceFundingRates,
  fetchBitgetFundingRates,
  fetchMexcFundingRates,
  fetchOkxFundingRates,
  fetchBybitFundingRates,
} from '@/app/lib/fundingRate';

type AlertDirection = 'above' | 'below';

type FundingAlert = {
  key: string; // exchange:symbol
  threshold: number;
  direction: AlertDirection;
  enabled: boolean;
  lastTriggeredAt?: number;
};

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

function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function fireAlert(
  exchange: string,
  symbol: string,
  rate: number,
  direction: AlertDirection,
  threshold: number
) {
  const body = `取引所: ${exchange.toUpperCase()}
銘柄: ${symbol}
現在: ${rate.toFixed(4)}%
条件: ${direction === 'below' ? '以下' : '以上'} ${threshold}%`;

  if (canNotify() && Notification.permission === 'granted') {
    try {
      new Notification('資金調達率アラート', { body });
      return;
    } catch {}
  }

  alert(`【資金調達率アラート】\n${body}`);
}

async function fetchAllFundingRates() {
  const [
    binance,
    bitget,
    mexc,
    okx,
    bybit,
  ] = await Promise.all([
    fetchBinanceFundingRates().catch(() => ({})),
    fetchBitgetFundingRates().catch(() => ({})),
    fetchMexcFundingRates().catch(() => ({})),
    fetchOkxFundingRates().catch(() => ({})),
    fetchBybitFundingRates().catch(() => ({})),
  ]);

  return { binance, bitget, mexc, okx, bybit };
}

export default function AlertRunner() {
  const runningRef = useRef(false);

  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const tick = async () => {
      try {
        const alerts = loadAlerts();
        const active = Object.values(alerts).filter(a => a.enabled);
        if (active.length === 0) return;

        const rates = await fetchAllFundingRates();
        const now = Date.now();
        let updated = false;

        for (const a of active) {
          const [exchange, symbol] = a.key.split(':');
          const rate = (rates as any)[exchange]?.[symbol];
          if (rate == null) continue;

          if (
            a.lastTriggeredAt &&
            now - a.lastTriggeredAt < COOLDOWN_MS
          ) {
            continue;
          }

          const hit =
            (a.direction === 'below' && rate <= a.threshold) ||
            (a.direction === 'above' && rate >= a.threshold);

          if (!hit) continue;

          fireAlert(exchange, symbol, rate, a.direction, a.threshold);

          alerts[a.key] = {
            ...a,
            lastTriggeredAt: now,
          };
          updated = true;
        }

        if (updated) saveAlerts(alerts);
      } catch (e) {
        console.error('[AlertRunner]', e);
      }
    };

    tick();
    const id = setInterval(tick, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
