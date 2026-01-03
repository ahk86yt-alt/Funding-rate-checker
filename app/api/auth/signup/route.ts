import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail.length < 3 || String(password).length < 6) {
      return NextResponse.json(
        { error: 'invalid email or password (min password: 6 chars)' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'email already exists' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.create({
      data: { email: normalizedEmail, password: hashed },
      select: { id: true, email: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error('POST /api/auth/signup failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
