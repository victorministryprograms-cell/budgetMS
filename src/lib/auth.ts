import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import crypto from "crypto";
import { prisma } from "./db";

const SESSION_COOKIE = "bms_session";
const SESSION_TTL_DAYS = 7;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a 32+ character secret in production");
    }
    return new TextEncoder().encode("dev-only-secret-please-set-AUTH_SECRET-1234567890");
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string, meta?: { ip?: string; ua?: string }) {
  const token = newToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt, ipAddress: meta?.ip, userAgent: meta?.ua },
  });

  const jwt = await new SignJWT({ sid: tokenHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secret());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return { tokenHash, expiresAt };
}

export async function destroySession() {
  const jar = await cookies();
  const jwt = jar.get(SESSION_COOKIE)?.value;
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, secret());
      const sid = payload.sid as string | undefined;
      if (sid) await prisma.session.deleteMany({ where: { tokenHash: sid } });
    } catch {
      // ignore invalid token on logout
    }
  }
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string | null;
  status: string;
  permissions: string[];
};

/** Cached per-request session lookup. Returns null when unauthenticated. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const jwt = jar.get(SESSION_COOKIE)?.value;
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, secret());
    const sid = payload.sid as string | undefined;
    if (!sid) return null;
    try {
      const session = await prisma.session.findUnique({
        where: { tokenHash: sid },
        include: {
          user: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      });
      if (!session || session.expiresAt < new Date()) return null;
      if (session.user.status !== "ACTIVE") return null;
      return {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role.name,
        organizationId: session.user.organizationId,
        status: session.user.status,
        permissions: session.user.role.permissions.map((rp) => rp.permission.key),
      };
    } catch (prismaError) {
      // Never fabricate a session when the session store is unreachable: doing so
      // would turn any signed token into an authenticated user. In production a
      // database outage is a hard auth failure.
      if (process.env.NODE_ENV === "production") {
        console.error("Session lookup failed:", prismaError);
        return null;
      }
      // Dev only: keep local development usable without a reachable database.
      return {
        id: String(sid).slice(0, 20),
        email: "dev-user@example.com",
        firstName: "Dev",
        lastName: "User",
        role: "ADMIN",
        organizationId: null,
        status: "ACTIVE",
        permissions: [],
      };
    }
  } catch {
    return null;
  }
});

export function sessionCookieName() {
  return SESSION_COOKIE;
}
