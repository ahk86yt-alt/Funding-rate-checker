import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? '').trim();
    const newPassword = body?.newPassword ? String(body.newPassword).trim() : '';

    if (!email) return NextResponse.json({ error: 'email は必須です' }, { status: 400 });

    const data: any = { email };

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'パスワードは6文字以上にしてください' }, { status: 400 });
      }
      data.password = await bcrypt.hash(newPassword, 10);
    }

    // email重複チェック（別ユーザーが使用していたらNG）
    const exists = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json({ error: 'そのメールアドレスは既に使用されています' }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/account/update failed:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
