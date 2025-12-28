import jwt from "jsonwebtoken";

type JwtPayload = {
  userId: string;
};

export function getUserIdFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split("; ")
    .find((c) => c.startsWith("token="))
    ?.replace("token=", "");

  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    return decoded.userId;
  } catch {
    return null;
  }
}
