import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/app/lib/prisma';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getUserId(req: Request): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const m = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!m) return null;

  const token = decodeURIComponent(m[1]);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded?.userId ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      return NextResponse.json({ error: 'メールアドレスが見つかりません' }, { status: 404 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY が未設定です（.env を確認してください）' },
        { status: 500 }
      );
    }

    const from = process.env.MAIL_FROM || 'onboarding@resend.dev';
    const resend = new Resend(apiKey);

    const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    const result = await resend.emails.send({
      from,
      to: user.email,
      subject: '【テスト】資金調達率チェッカー テストメール',
      text: `テストメールです。\n送信時刻: ${now}\n\nこのメールが届けば、送信設定は正常です。`,
    });

    // Resendがエラーを返す場合もあるので明示チェック
    if ((result as any)?.error) {
      console.error('Resend error:', (result as any).error);
      return NextResponse.json(
        { error: 'メール送信に失敗しました（Resend）' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, to: user.email, from });
  } catch (e) {
    console.error('POST /api/mail/test failed:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
