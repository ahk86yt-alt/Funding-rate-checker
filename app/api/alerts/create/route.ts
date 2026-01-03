import { NextResponse } from 'next/server';

// 互換：/api/alerts/create -> /api/alerts と同じ挙動
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // 同一オリジン内で /api/alerts に転送
  // base URL を作る
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  const body = await req.text(); // そのまま転送
  const cookie = req.headers.get('cookie') ?? '';

  const res = await fetch(new URL('/api/alerts', baseUrl), {
    method: 'POST',
    headers: {
      'content-type': req.headers.get('content-type') ?? 'application/json',
      cookie,
    },
    body,
    cache: 'no-store',
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}
