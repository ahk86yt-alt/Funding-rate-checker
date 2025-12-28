import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";
import { sendVerifyEmail } from "@/app/lib/sendVerifyEmail";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // ---- バリデーション ----
    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    // ---- 既存ユーザー確認 ----
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // ---- パスワードハッシュ ----
    const hashedPassword = await bcrypt.hash(password, 10);

    // ★ メール確認用トークン生成
    const verifyToken = crypto.randomUUID();

    // ---- ユーザー作成（未確認）----
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        emailVerified: false,
        emailVerifyToken: verifyToken,
      },
    });

    // ★ 確認メール送信
    await sendVerifyEmail(user.email, verifyToken);

    // ---- レスポンス ----
    return NextResponse.json(
      {
        message: "Verification email sent",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[SIGNUP ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
