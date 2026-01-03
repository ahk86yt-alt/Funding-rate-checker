// app/hooks/useAlerts.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FundingAlert, loadAlerts, saveAlerts, uid } from '@/app/lib/alerts';

export function useAlerts() {
  const [alerts, setAlerts] = useState<FundingAlert[]>([]);

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  useEffect(() => {
    saveAlerts(alerts);
  }, [alerts]);

  const addAlert = useCallback((a: Omit<FundingAlert, 'id' | 'createdAt'>) => {
    setAlerts((prev) => [
      { ...a, id: uid(), createdAt: Date.now() },
      ...prev,
    ]);
  }, []);

  const updateAlert = useCallback((id: string, patch: Partial<FundingAlert>) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  }, []);

  const clearRuntimeState = useCallback((id?: string) => {
    // clears lastValue / lastTriggeredAt for re-arming
    setAlerts((prev) =>
      prev.map((a) => {
        if (id && a.id !== id) return a;
        const { lastValue, lastTriggeredAt, ...rest } = a as any;
        return { ...rest };
      })
    );
  }, []);

  const enabledCount = useMemo(() => alerts.filter((a) => a.enabled).length, [alerts]);

  return { alerts, enabledCount, addAlert, updateAlert, removeAlert, toggleAlert, clearRuntimeState };
}
