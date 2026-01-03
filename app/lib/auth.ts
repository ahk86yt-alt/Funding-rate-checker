import jwt from 'jsonwebtoken';

type JwtPayload = {
  userId: string;
};

export function getUserIdFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie') ?? '';

  // `;` 区切りを trim して探す（`; ` じゃないケースでもOKにする）
  const token = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((c) => c.startsWith('token='))
    ?.replace('token=', '');

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return decoded.userId ?? null;
  } catch {
    return null;
  }
}
