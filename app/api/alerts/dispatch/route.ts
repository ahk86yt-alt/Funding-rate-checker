// app/api/alerts/dispatch/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Direction = 'above' | 'below';

type AuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function getBearerToken(req: Request) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || '';
}

/**
 * dispatch の保護
 * - DISPATCH_SECRET / CRON_SECRET / ALERT_CRON_SECRET の「どれか」に一致すればOK
 * - どれも未設定なら 500
 */
function isAuthorized(req: Request): AuthResult {
  const secrets = [
    process.env.DISPATCH_SECRET,
    process.env.CRON_SECRET,
    process.env.ALERT_CRON_SECRET,
  ].filter((v): v is string => Boolean(v && v.trim()));

  if (secrets.length === 0) {
    return { ok: false, status: 500, error: 'DISPATCH_SECRET / CRON_SECRET / ALERT_CRON_SECRET が未設定です' };
  }

  const token = getBearerToken(req);
  if (!token || !secrets.includes(token)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}

function getAppBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    '';

  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}

function fmtPct(v: number) {
  if (!Number.isFinite(v)) return '-';
  return `${v.toFixed(4)}%`;
}

function fmtDir(d: Direction) {
  return d === 'above' ? '以上' : '以下';
}

function isTriggered(direction: Direction, rate: number, threshold: number) {
  if (direction === 'above') return rate >= threshold;
  return rate <= threshold;
}

function shouldCooldown(lastSentAt: Date | null, cooldownMinutes: number) {
  if (!lastSentAt) return false;
  const dt = Date.now() - new Date(lastSentAt).getTime();
  return dt < cooldownMinutes * 60_000;
}

function buildMail(params: {
  email: string;
  exchange: string;
  symbol: string;
  direction: Direction;
  threshold: number;
  rate: number;
  rateAt: Date;
}) {
  const baseUrl = getAppBaseUrl();
  const rateUrl = `${baseUrl}/rate/${encodeURIComponent(
    params.exchange.toLowerCase()
  )}/${encodeURIComponent(params.symbol.toUpperCase())}`;

  const subject = `【資金調達率アラート】${params.exchange.toUpperCase()} / ${params.symbol.toUpperCase()} が条件に到達`;

  const text = [
    '資金調達率アラートがトリガーしました。',
    '',
    `取引所：${params.exchange.toUpperCase()}`,
    `銘柄：${params.symbol.toUpperCase()}`,
    `条件：${fmtDir(params.direction)} ${fmtPct(params.threshold)}`,
    `現在値：${fmtPct(params.rate)}`,
    `判定時刻：${new Date(params.rateAt).toLocaleString('ja-JP')}`,
    '',
    `レートページ：${rateUrl}`,
    '',
    '※このメールは自動送信です。',
  ].join('\n');

  const html = `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6;">
    <h2 style="margin:0 0 10px;">資金調達率アラート（トリガー）</h2>
    <div style="color:#111827;">
      <div><b>取引所：</b>${params.exchange.toUpperCase()}</div>
      <div><b>銘柄：</b>${params.symbol.toUpperCase()}</div>
      <div><b>条件：</b>${fmtDir(params.direction)} ${fmtPct(params.threshold)}</div>
      <div><b>現在値：</b>${fmtPct(params.rate)}</div>
      <div><b>判定時刻：</b>${new Date(params.rateAt).toLocaleString('ja-JP')}</div>
    </div>
    <div style="margin-top:14px;">
      <a href="${rateUrl}" style="display:inline-block; padding:10px 12px; border:1px solid #d1d5db; border-radius:10px; text-decoration:none; font-weight:800; color:#111827;">
        レートページを開く
      </a>
    </div>
    <div style="margin-top:16px; color:#6b7280; font-size:12px;">※このメールは自動送信です。</div>
  </div>
  `;

  return { subject, text, html };
}

async function dispatchCore(dryRun: boolean) {
  const cooldownMinutes = Number(process.env.ALERT_COOLDOWN_MINUTES ?? '30');

  const alerts = await prisma.alert.findMany({
    where: { enabled: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      exchange: true,
      symbol: true,
      direction: true,
      threshold: true,
      enabled: true,
      lastSentAt: true,
      lastSentRate: true,
      user: { select: { email: true } },
    },
  });

  const results: any[] = [];
  let fired = 0;
  let skipped = 0;
  let errored = 0;

  const resendKey = process.env.RESEND_API_KEY || '';
  const mailFrom = process.env.MAIL_FROM || '';
  const resend = !dryRun ? new Resend(resendKey) : null;

  for (const a of alerts) {
    try {
      const exchange = String(a.exchange || '').toLowerCase();
      const symbol = String(a.symbol || '').toUpperCase();
      const direction = (String(a.direction) as Direction) || 'above';
      const threshold = Number(a.threshold);

      if (
        !exchange ||
        !symbol ||
        (direction !== 'above' && direction !== 'below') ||
        !Number.isFinite(threshold)
      ) {
        skipped++;
        results.push({ id: a.id, exchange, symbol, action: 'skipped', reason: 'アラート設定が不正です' });
        continue;
      }

      const latest = await prisma.fundingRateRecord.findFirst({
        where: { exchange, symbol },
        orderBy: { createdAt: 'desc' },
        select: { rate: true, createdAt: true },
      });

      if (!latest) {
        skipped++;
        results.push({ id: a.id, exchange, symbol, action: 'skipped', reason: '最新レートがDBにありません（履歴未収集）' });
        continue;
      }

      const rate = Number(latest.rate);
      if (!Number.isFinite(rate)) {
        skipped++;
        results.push({ id: a.id, exchange, symbol, action: 'skipped', reason: '最新レートが不正です' });
        continue;
      }

      if (!isTriggered(direction, rate, threshold)) {
        skipped++;
        results.push({ id: a.id, exchange, symbol, action: 'skipped', reason: '条件未達です', rate, threshold, direction });
        continue;
      }

      if (shouldCooldown(a.lastSentAt ?? null, cooldownMinutes)) {
        skipped++;
        results.push({ id: a.id, exchange, symbol, action: 'skipped', reason: `クールダウン中（${cooldownMinutes}分）`, rate, threshold, direction });
        continue;
      }

      if (dryRun) {
        fired++;
        results.push({ id: a.id, exchange, symbol, action: 'fired(dryRun)', rate, threshold, direction });
        continue;
      }

      if (!resendKey) throw new Error('RESEND_API_KEY が未設定です');
      if (!mailFrom) throw new Error('MAIL_FROM が未設定です');

      const to = a.user?.email;
      if (!to) throw new Error('ユーザーのメールアドレスが取得できません');

      const mail = buildMail({
        email: to,
        exchange,
        symbol,
        direction,
        threshold,
        rate,
        rateAt: latest.createdAt,
      });

      await resend!.emails.send({
        from: mailFrom,
        to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });

      await prisma.alert.update({
        where: { id: a.id },
        data: {
          lastSentAt: new Date(),
          lastSentRate: rate,
        },
      });

      fired++;
      results.push({ id: a.id, exchange, symbol, action: 'fired', rate, threshold, direction });
    } catch (e: any) {
      errored++;
      results.push({
        id: a.id,
        exchange: a.exchange,
        symbol: a.symbol,
        action: 'errored',
        reason: String(e?.message ?? e),
      });
    }
  }

  return {
    ok: true,
    dryRun,
    summary: { total: alerts.length, fired, skipped, errored },
    results,
    at: new Date().toISOString(),
  };
}

/**
 * GET /api/alerts/dispatch
 * - デフォルト：本番実行（送信 + lastSent更新）
 * - ?dryRun=1 のときだけ dryRun
 */
export async function GET(req: Request) {
  const auth = isAuthorized(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') === '1';

    const data = await dispatchCore(dryRun);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    console.error('GET /api/alerts/dispatch failed:', e);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'production' ? 'dispatch でエラー' : String(e?.message ?? e),
        stack: process.env.NODE_ENV === 'production' ? undefined : e?.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts/dispatch
 * - 互換のため残す（手動実行用）
 * - body で { dryRun: true } を送ったら dryRun にもできる
 */
export async function POST(req: Request) {
  const auth = isAuthorized(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);

    const data = await dispatchCore(dryRun);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    console.error('POST /api/alerts/dispatch failed:', e);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'production' ? 'dispatch でエラー' : String(e?.message ?? e),
        stack: process.env.NODE_ENV === 'production' ? undefined : e?.stack,
      },
      { status: 500 }
    );
  }
}
