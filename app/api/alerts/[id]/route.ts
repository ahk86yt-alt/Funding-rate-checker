// app/api/alerts/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUserIdFromRequest } from '@/app/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Direction = 'above' | 'below';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function badRequest(message: string) {
  return jsonError(message, 400);
}

async function getIdFromParams(params: Promise<{ id: string }>) {
  const p = await params;
  return String(p?.id ?? '').trim();
}

/**
 * PATCH /api/alerts/:id
 * body: { enabled?: boolean, threshold?: number, direction?: "above"|"below", firedAt?: string, firedRate?: number }
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonError('Unauthorized', 401);

  try {
    const id = await getIdFromParams(ctx.params);
    if (!id) return badRequest('id is required');

    const body = await req.json().catch(() => null as any);
    const data: any = {};

    if (typeof body?.enabled === 'boolean') data.enabled = body.enabled;

    if (body?.threshold != null) {
      const th = Number(body.threshold);
      if (!Number.isFinite(th)) return badRequest('threshold is invalid');
      data.threshold = th;
    }

    if (body?.direction != null) {
      const d = String(body.direction) as Direction;
      if (d !== 'above' && d !== 'below') return badRequest('direction is invalid');
      data.direction = d;
    }

    // 発火記録（dispatch から更新する想定）
    if (body?.firedAt != null) {
      const d = new Date(String(body.firedAt));
      if (Number.isNaN(d.getTime())) return badRequest('firedAt is invalid');
      data.lastSentAt = d;
    }
    if (body?.firedRate != null) {
      const r = Number(body.firedRate);
      if (!Number.isFinite(r)) return badRequest('firedRate is invalid');
      data.lastSentRate = r;
    }

    const updated = await prisma.alert.update({
      where: { id, userId },
      data,
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

    return NextResponse.json({ alert: updated });
  } catch (e: any) {
    console.error('PATCH /api/alerts/[id] failed:', e);
    const detail =
      e?.message ?? (typeof e === 'string' ? e : JSON.stringify(e));

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? '更新に失敗しました（サーバー）'
            : `更新に失敗しました（サーバー）: ${detail}`,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts/:id
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonError('Unauthorized', 401);

  try {
    const id = await getIdFromParams(ctx.params);
    if (!id) return badRequest('id is required');

    // deleteMany だと「存在しない」でも例外にならず安全
    const r = await prisma.alert.deleteMany({
      where: { id, userId },
    });

    if (r.count === 0) return jsonError('not found', 404);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('DELETE /api/alerts/[id] failed:', e);
    const detail =
      e?.message ?? (typeof e === 'string' ? e : JSON.stringify(e));

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? '削除に失敗しました（サーバー）'
            : `削除に失敗しました（サーバー）: ${detail}`,
      },
      { status: 500 }
    );
  }
}
