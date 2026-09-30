import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, sessionCookieName } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { verifyDevPassword } from "@/lib/auth-dev-fallback";
import { SignJWT } from "jose";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email and password are required." } }, { status: 400 });
    }

    // Try Prisma database first
    try {
      const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
      if (user) {
        // DB path - full validation
        if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
          return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid email or password." } }, { status: 401 });
        }
        if (user.status !== "ACTIVE") {
          return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: `Account is ${user.status.toLowerCase()}.` } }, { status: 403 });
        }
        if (user.organizationId) {
          const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
          if (!org || org.status !== "ACTIVE") {
            return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Organization is not active." } }, { status: 403 });
          }
        }
        await createSession(user.id, { ip: req.headers.get("x-forwarded-for") ?? undefined, ua: req.headers.get("user-agent") ?? undefined });
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await audit({ organizationId: user.organizationId, userId: user.id, action: "USER_UPDATED", entityType: "User", entityId: user.id, newValues: { login: true } });
        return NextResponse.json({ success: true, data: { role: user.role.name } });
      }

      // DB path didn't find user - fall through to dev fallback
      throw new Error("User not found in database");
    } catch {
      // Database error - fall back to dev credentials
      const devResult = await verifyDevPassword(password, email);
      if (devResult.valid && devResult.user) {
        // Create session cookie for dev mode
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const jwt = await new SignJWT({ sid: token })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-only-secret-please-set-AUTH_SECRET-1234567890"));
        
        const response = NextResponse.json({ success: true, data: { role: devResult.user.role } });
        response.cookies.set(sessionCookieName(), jwt, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires,
        });
        return response;
      }
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid email or password." } }, { status: 401 });
    }
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Authentication service unavailable." } }, { status: 500 });
  }
}