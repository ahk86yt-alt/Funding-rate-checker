import { prisma } from '@/app/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { enabled } = await req.json();

  const alert = await prisma.alert.update({
    where: { id: params.id },
    data: { enabled: Boolean(enabled) },
  });

  return NextResponse.json(alert);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.alert.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
