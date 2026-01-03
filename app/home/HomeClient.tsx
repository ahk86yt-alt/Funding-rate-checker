// app/home/HomeClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import AlertsPanel from '@/app/components/AlertsPanel';
import { FundingMap } from '@/app/lib/alerts';
import { notifyBrowser, ensureNotificationPermission } from '@/app/lib/notify';
import { useAlerts } from '@/app/hooks/useAlerts';
import { useAlertEngine } from '@/app/hooks/useAlertEngine';

// 既存のレスポンス仕様に合わせる
type FundingAllResponse = {
  symbols: string[];
  funding: FundingMap;
  errors?: Record<string, string>;
};

export default function HomeClient() {
  const [data, setData] = useState<FundingAllResponse | null>(null);
  const [pollSec, setPollSec] = useState<number>(30);

  const { alerts, addAlert, updateAlert, removeAlert, toggleAlert, clearRuntimeState } = useAlerts();

  async function fetchAll() {
    const res = await fetch('/api/funding/all', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as FundingAllResponse;
    setData(json);
  }

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, Math.max(5, pollSec) * 1000);
    return () => clearInterval(id);
  }, [pollSec]);

  // アラート判定（funding更新ごと）
  useAlertEngine({
    funding: data?.funding,
    alerts,
    onPatchAlert: updateAlert,
    notify: ({ title, body }) => {
      // ここは後で「トースト」等に差し替え可
      notifyBrowser({ title, body });
    },
  });

  // 初回だけ通知許可を促したいなら（強制はしない）
  useEffect(() => {
    // 任意：自動でリクエストは好み分かれるので、基本はボタンに任せるのが無難
    // ensureNotificationPermission();
  }, []);

  const symbols = useMemo(() => data?.symbols ?? [], [data]);

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-4 p-4">
      <div className="flex-1">
        {/* ここに既存の資金調達率テーブルUIを置く */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-neutral-100">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Funding Rates</div>
            <label className="text-sm text-neutral-300">
              Poll (sec)
              <input
                className="ml-2 w-20 rounded-lg border border-neutral-800 bg-neutral-950 p-1"
                inputMode="numeric"
                value={pollSec}
                onChange={(e) => setPollSec(Number(e.target.value))}
              />
            </label>
          </div>

          {/* TODO: 既存テーブルをここへ */}
          <div className="mt-3 text-sm text-neutral-300">
            テーブルは既存のコンポーネントをここに配置してください。
          </div>
        </div>
      </div>

      <div className="w-[420px] shrink-0">
        <AlertsPanel
          symbols={symbols}
          alerts={alerts}
          addAlert={addAlert}
          updateAlert={updateAlert}
          removeAlert={removeAlert}
          toggleAlert={toggleAlert}
          clearRuntimeState={clearRuntimeState}
        />
      </div>
    </div>
  );
}
