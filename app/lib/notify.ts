// app/lib/notify.ts
'use client';

type FiredPayload = {
  alertId: string;
  firedRate: number; // %（例: -0.0123）
};

export function canUseNotification() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!canUseNotification()) return 'denied';

  // 既に決まっている場合はそのまま
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  // default のときだけリクエスト
  return await Notification.requestPermission();
}

export function notifyBrowser(p: { title: string; body: string }) {
  if (!canUseNotification()) return;
  if (Notification.permission !== 'granted') return;
  new Notification(p.title, { body: p.body });
}

/**
 * ✅ 発火情報をDBに記録（アラート管理で「発火済み」を見える化）
 * - /api/alerts (PATCH) に { id, firedAt, firedRate } を投げる
 * - 失敗しても通知自体は止めない
 */
export async function markAlertFired(p: FiredPayload) {
  try {
    const firedAt = new Date().toISOString();

    const res = await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: p.alertId,
        // ✅ fired status update
        firedAt,
        firedRate: p.firedRate,
      }),
    });

    // PATCH が 4xx/5xx でもここでは投げない（UI側の通知を優先）
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      console.warn('markAlertFired failed:', res.status, data?.error ?? '');
    }
  } catch (e) {
    console.warn('markAlertFired error:', e);
  }
}

/**
 * ✅ ブラウザ通知 + 発火記録をまとめて呼ぶ用（任意）
 */
export async function notifyAndMarkFired(p: {
  title: string;
  body: string;
  alertId: string;
  firedRate: number;
}) {
  notifyBrowser({ title: p.title, body: p.body });
  await markAlertFired({ alertId: p.alertId, firedRate: p.firedRate });
}
