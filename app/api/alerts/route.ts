// app/api/alerts/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUserIdFromRequest } from '@/app/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Direction = 'above' | 'below';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/alerts
 * 自分のアラート一覧
 */
export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonError('Unauthorized', 401);

  try {
    const alerts = await prisma.alert.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        exchange: true,
        symbol: true,
        direction: true,
        threshold: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
        // トリガー判定表示用（schemaにある前提）
        lastSentAt: true,
        lastSentRate: true,
      },
    });

    return NextResponse.json({ alerts });
  } catch (e) {
    console.error('GET /api/alerts failed:', e);
    return jsonError('取得に失敗しました（サーバー）', 500);
  }
}

/**
 * POST /api/alerts
 * アラート作成
 * body: { exchange: string, symbol: string, direction: "above"|"below", threshold: number }
 */
export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonError('Unauthorized', 401);

  try {
    const body = await req.json().catch(() => null as any);

    const exchange = String(body?.exchange ?? '').toLowerCase().trim();
    const symbol = String(body?.symbol ?? '').toUpperCase().trim();
    const direction = String(body?.direction ?? '').trim() as Direction;
    const threshold = Number(body?.threshold);

    if (!exchange) return jsonError('exchange is required', 400);
    if (!symbol) return jsonError('symbol is required', 400);
    if (direction !== 'above' && direction !== 'below') {
      return jsonError('direction must be "above" or "below"', 400);
    }
    if (!Number.isFinite(threshold)) return jsonError('threshold is invalid', 400);

    const alert = await prisma.alert.create({
      data: {
        userId,
        exchange,
        symbol,
        direction,
        threshold,
        enabled: true,
      },
      select: {
        id: true,
        exchange: true,
        symbol: true,
        direction: true,
        threshold: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
        lastSentAt: true,
        lastSentRate: true,
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/alerts failed:', e);

    // 開発中は原因が分かる方が楽なので detail を出す（本番は隠す）
    const detail =
      e?.message ?? (typeof e === 'string' ? e : JSON.stringify(e));

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'アラート作成に失敗しました（サーバー）'
            : `アラート作成に失敗しました（サーバー）: ${detail}`,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts?id=xxxx
 * 互換用：クエリ指定で削除（レートページ側が /api/alerts?id=... を叩く場合に備える）
 */
export async function DELETE(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonError('Unauthorized', 401);

  try {
    const url = new URL(req.url);
    const id = String(url.searchParams.get('id') ?? '').trim();
    if (!id) return jsonError('id is required', 400);

    // deleteMany にすると「存在しない」でも例外にならず扱いやすい
    const r = await prisma.alert.deleteMany({
      where: { id, userId },
    });

    if (r.count === 0) return jsonError('not found', 404);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('DELETE /api/alerts failed:', e);
    return jsonError('削除に失敗しました（サーバー）', 500);
  }
}
