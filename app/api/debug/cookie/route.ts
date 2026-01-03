import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/app/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const userId = getUserIdFromRequest(req);

  return NextResponse.json({
    hasCookieHeader: cookieHeader.length > 0,
    cookieHeaderPreview: cookieHeader.slice(0, 200), // 長いので先頭だけ
    hasToken: /(?:^|;\s*)token=/.test(cookieHeader),
    userId,
  });
}
