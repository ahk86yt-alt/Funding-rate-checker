import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/funding/record
// body: { exchange: string, symbol: string, rate: number }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const exchange = String(body?.exchange ?? '').toLowerCase();
    const symbol = String(body?.symbol ?? '').toUpperCase();
    const rate = Number(body?.rate);

    if (!exchange || !symbol || !Number.isFinite(rate)) {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    }

    // 直近が「9秒以内」なら重複扱いでスキップ（連打対策）
    const last = await prisma.fundingRateRecord.findFirst({
      where: { exchange, symbol },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (last) {
      const dt = Date.now() - new Date(last.createdAt).getTime();
      if (dt < 9_000) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }

    await prisma.fundingRateRecord.create({
      data: { exchange, symbol, rate },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/funding/record failed:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
