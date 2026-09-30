import { newToken, hashToken } from "./auth";
import { SignJWT } from "jose";
import type { SessionUser } from "./auth";

// Demo users for development fallback (stored in Map for proper typing)
const DEMO_USERS_MAP = new Map<
  string,
  {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    plainPassword: string;
  }
>([
  ["superadmin@example.com", {
    id: "superadmin-demo-id",
    email: "superadmin@example.com",
    role: "SUPERADMIN",
    permissions: [
      "organization:create", "organization:read", "organization:update", "organization:delete",
      "user:create", "user:read", "user:update", "user:deactivate",
      "role:read", "role:update",
      "budget:create", "budget:read", "budget:update", "budget:delete",
      "budget:submit", "budget:approve", "budget:reject",
      "transaction:create", "transaction:read", "transaction:update",
      "transaction:submit", "transaction:approve", "transaction:reject",
      "category:create", "category:read", "category:update", "category:delete",
      "department:create", "department:read", "department:update", "department:delete",
      "project:create", "project:read", "project:update", "project:delete",
      "report:read", "audit:read",
      "settings:read", "settings:update"],
    plainPassword: "Superadmin123!",
  }],
  ["admin@demo.com", {
    id: "admin-demo-id",
    email: "admin@demo.com",
    role: "ADMIN",
    permissions: ["budget:create", "budget:read", "budget:update", "budget:delete",
      "budget:submit", "budget:approve", "budget:reject",
      "transaction:create", "transaction:read", "transaction:update",
      "transaction:submit", "transaction:approve", "transaction:reject",
      "category:create", "category:read", "category:update", "category:delete",
      "department:create", "department:read", "department:update", "department:delete",
      "project:create", "project:read", "project:update", "project:delete",
      "report:read", "user:read", "user:create", "user:update", "user:deactivate",
      "settings:read"],
    plainPassword: "Admin123!",
  }],
]);

export type DevUser = {
  id: string;
  email: string;
  role: string;
  permissions: string[];
};

export async function verifyDevPassword(password: string, email: string): Promise<{ valid: boolean; user?: DevUser }> {
  const user = DEMO_USERS_MAP.get(email);
  if (!user) return { valid: false };
  if (user.plainPassword === password) {
    const { plainPassword, ...rest } = user;
    return { valid: true, user: rest };
  }
  return { valid: false };
}

export async function createDevSession(userId: string, meta?: { ip?: string; ua?: string }) {
  const token = newToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Mock session storage
  const sessions: Record<string, { userId: string; tokenHash: string; expiresAt: Date; ip?: string; ua?: string }> = {};
  sessions[token] = { userId, tokenHash, expiresAt, ip: meta?.ip, ua: meta?.ua };

  const jwt = await new SignJWT({ sid: tokenHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-only-secret-please-set-AUTH_SECRET-1234567890"));

  return { token, jwt, sessions };
}

export async function invalidateDevSession(token: string, sessions: Record<string, { userId: string; tokenHash: string; expiresAt: Date }>) {
  delete sessions[token];
}