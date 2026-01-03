import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUserIdFromRequest } from '@/app/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const alerts = await prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ alerts }, { status: 200 });
  } catch (e) {
    console.error('GET /api/alerts failed:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const exchange = String(body.exchange ?? '').trim();
    const symbol = String(body.symbol ?? '').trim().toUpperCase();
    const direction = String(body.direction ?? '').trim();
    const threshold = Number(body.threshold);

    const allowedDirections = new Set(['above', 'below', 'absAbove']);
    if (!exchange || !symbol) {
      return NextResponse.json({ error: 'exchange and symbol are required' }, { status: 400 });
    }
    if (!allowedDirections.has(direction)) {
      return NextResponse.json({ error: 'direction is invalid' }, { status: 400 });
    }
    if (!Number.isFinite(threshold)) {
      return NextResponse.json({ error: 'threshold is invalid' }, { status: 400 });
    }

    const created = await prisma.alert.create({
      data: {
        userId,
        exchange,
        symbol,
        direction,
        threshold,
        enabled: true,
      },
    });

    return NextResponse.json({ alert: created }, { status: 201 });
  } catch (e) {
    console.error('POST /api/alerts failed:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
