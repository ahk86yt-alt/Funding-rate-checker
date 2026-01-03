export type AlertDirection = 'above' | 'below';

export function fmtRate(v: number) {
  return `${v.toFixed(4)}%`;
}

export function fmtJst(dt: Date) {
  return dt.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function directionText(dir: AlertDirection) {
  return dir === 'above' ? '以上' : '以下';
}

export function buildRateUrl(baseUrl: string, exchange: string, symbol: string) {
  // baseUrl例: https://xxx.vercel.app
  return `${baseUrl.replace(/\/$/, '')}/rate/${encodeURIComponent(exchange)}/${encodeURIComponent(symbol)}`;
}

export function buildAlertMail(args: {
  exchange: string;
  symbol: string;
  direction: AlertDirection;
  threshold: number;
  current: number;
  triggeredAt: Date;
  rateUrl: string;
}) {
  const { exchange, symbol, direction, threshold, current, triggeredAt, rateUrl } = args;

  const subject = `【資金調達率アラート】${symbol} / ${exchange.toUpperCase()} が条件に一致`;

  const line1 = `${symbol}（${exchange.toUpperCase()}）の資金調達率がアラート条件に一致しました。`;
  const line2 = `現在値: ${fmtRate(current)}`;
  const line3 = `条件: ${fmtRate(threshold)} ${directionText(direction)}`;
  const line4 = `判定時刻（JST）: ${fmtJst(triggeredAt)}`;
  const line5 = `確認ページ: ${rateUrl}`;

  const text = [line1, '', line2, line3, line4, '', line5].join('\n');

  // HTML（最小）
  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif; line-height: 1.6;">
    <h2 style="margin: 0 0 12px;">資金調達率アラート</h2>
    <p style="margin: 0 0 12px;">${symbol}（${exchange.toUpperCase()}）の資金調達率がアラート条件に一致しました。</p>

    <table style="border-collapse: collapse; margin: 12px 0;">
      <tr>
        <td style="padding: 6px 10px; color: #6b7280;">現在値</td>
        <td style="padding: 6px 10px; font-weight: 800;">${fmtRate(current)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #6b7280;">条件</td>
        <td style="padding: 6px 10px; font-weight: 800;">${fmtRate(threshold)} ${directionText(direction)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #6b7280;">判定時刻（JST）</td>
        <td style="padding: 6px 10px; font-weight: 800;">${fmtJst(triggeredAt)}</td>
      </tr>
    </table>

    <p style="margin: 16px 0 0;">
      <a href="${rateUrl}" style="display: inline-block; padding: 10px 12px; background: #111827; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 800;">
        確認ページを開く
      </a>
    </p>

    <p style="margin: 16px 0 0; color:#6b7280; font-size: 12px;">
      このメールは資金調達率チェッカーのアラート機能により自動送信されています。
    </p>
  </div>
  `.trim();

  return { subject, text, html };
}
