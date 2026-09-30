import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { newToken, hashToken, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (req.nextUrl.pathname.endsWith("/forgot")) {
    const email = String(body.email ?? "").toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const raw = newToken();
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 3600_000) },
      });
      // MVP: log token server-side when no email server configured
      console.log(`[password-reset] user=${email} token=${raw}`);
    }
    return NextResponse.json({ success: true, data: { message: "If the account exists, a reset link was issued." } });
  }
  // reset
  const { token, password } = body as { token?: string; password?: string };
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid token or password." } }, { status: 400 });
  }
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: { code: "INVALID_STATUS", message: "Reset token is invalid or expired." } }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: rec.userId } }),
  ]);
  return NextResponse.json({ success: true, data: { message: "Password updated." } });
}
