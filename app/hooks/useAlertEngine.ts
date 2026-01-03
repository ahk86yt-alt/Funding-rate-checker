// app/hooks/useAlertEngine.ts
'use client';

import { useEffect, useRef } from 'react';
import { FundingAlert, FundingMap, formatRatePct, getRate, shouldTrigger } from '@/app/lib/alerts';

type NotifyFn = (p: { title: string; body: string }) => void;

export function useAlertEngine(params: {
  funding?: FundingMap;
  alerts: FundingAlert[];
  onPatchAlert: (id: string, patch: Partial<FundingAlert>) => void;
  notify: NotifyFn;
}) {
  const { funding, alerts, onPatchAlert, notify } = params;
  const tickRef = useRef(0);

  useEffect(() => {
    if (!funding) return;

    // prevent multiple runs per render storm
    tickRef.current += 1;
    const tick = tickRef.current;

    for (const a of alerts) {
      if (!a.enabled) continue;

      const curr = getRate(funding, a.exchange, a.symbol);
      if (curr == null) continue;

      const now = Date.now();
      const cooldownMs = Math.max(0, (a.cooldownSec ?? 0) * 1000);
      const canTrigger = a.lastTriggeredAt == null || now - a.lastTriggeredAt >= cooldownMs;

      const trigger = canTrigger && shouldTrigger({
        mode: a.mode,
        threshold: a.threshold,
        oncePerCrossing: a.oncePerCrossing,
        prev: a.lastValue,
        curr,
      });

      // Update lastValue every time (important for crossing)
      onPatchAlert(a.id, { lastValue: curr });

      if (!trigger) continue;

      const modeLabel =
        a.mode === 'above' ? '≥' : a.mode === 'below' ? '≤' : '| | ≥';
      const title = `Funding Alert: ${a.exchange.toUpperCase()} ${a.symbol}`;
      const body = `${modeLabel} ${a.threshold}%  (now ${formatRatePct(curr)})`;

      // notify once per tick
      if (tickRef.current === tick) {
        notify({ title, body });
      }

      onPatchAlert(a.id, { lastTriggeredAt: now });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funding]); // evaluate on funding update only
}
