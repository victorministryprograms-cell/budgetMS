import { getSession } from "./auth";
import { AppError } from "./errors";

/** All permission keys in the system. */
export const PERMISSIONS = {
  // org
  ORG_CREATE: "organization:create",
  ORG_READ: "organization:read",
  ORG_UPDATE: "organization:update",
  ORG_DELETE: "organization:delete",
  // users
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DEACTIVATE: "user:deactivate",
  // roles
  ROLE_READ: "role:read",
  ROLE_UPDATE: "role:update",
  // budgets
  BUDGET_CREATE: "budget:create",
  BUDGET_READ: "budget:read",
  BUDGET_UPDATE: "budget:update",
  BUDGET_DELETE: "budget:delete",
  BUDGET_SUBMIT: "budget:submit",
  BUDGET_APPROVE: "budget:approve",
  BUDGET_REJECT: "budget:reject",
  // transactions
  TX_CREATE: "transaction:create",
  TX_READ: "transaction:read",
  TX_UPDATE: "transaction:update",
  TX_SUBMIT: "transaction:submit",
  TX_APPROVE: "transaction:approve",
  TX_REJECT: "transaction:reject",
  // master data
  CAT_CREATE: "category:create",
  CAT_READ: "category:read",
  CAT_UPDATE: "category:update",
  CAT_DELETE: "category:delete",
  DEPT_CREATE: "department:create",
  DEPT_READ: "department:read",
  DEPT_UPDATE: "department:update",
  DEPT_DELETE: "department:delete",
  PROJ_CREATE: "project:create",
  PROJ_READ: "project:read",
  PROJ_UPDATE: "project:update",
  PROJ_DELETE: "project:delete",
  // misc
  REPORT_READ: "report:read",
  AUDIT_READ: "audit:read",
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SUPERADMIN_PERMISSIONS: string[] = Object.values(PERMISSIONS);

export const ADMIN_PERMISSIONS: string[] = [
  "budget:create",
  "budget:read",
  "budget:update",
  "budget:delete",
  "budget:submit",
  "budget:approve",
  "budget:reject",
  "transaction:create",
  "transaction:read",
  "transaction:update",
  "transaction:submit",
  "transaction:approve",
  "transaction:reject",
  "category:create",
  "category:read",
  "category:update",
  "category:delete",
  "department:create",
  "department:read",
  "department:update",
  "department:delete",
  "project:create",
  "project:read",
  "project:update",
  "project:delete",
  "report:read",
  "user:read",
  "user:create",
  "user:update",
  "user:deactivate",
  "settings:read",
];

/** Require an authenticated session; throws UNAUTHORIZED otherwise. */
export async function requireAuth() {
  const s = await getSession();
  if (!s) throw new AppError("UNAUTHORIZED", "You must be signed in.");
  return s;
}

/** Require one (or any) of the given permissions; throws FORBIDDEN otherwise. */
export async function requirePermission(...keys: string[]) {
  const s = await requireAuth();
  const ok = keys.some((k) => s.permissions.includes(k));
  if (!ok) throw new AppError("FORBIDDEN", "You do not have permission to perform this action.");
  return s;
}

export function isSuperAdmin(role: string) {
  return role === "SUPERADMIN";
}

/**
 * Resolve the organization scope for a query.
 * SUPERADMIN may pass an explicit orgId (or none for system-wide);
 * ADMIN is always scoped to their own organization.
 */
export async function requireOrganizationAccess(explicitOrgId?: string | null) {
  const s = await requireAuth();
  if (isSuperAdmin(s.role)) {
    return { session: s, organizationId: explicitOrgId ?? null };
  }
  if (!s.organizationId) throw new AppError("FORBIDDEN", "No organization assigned.");
  if (explicitOrgId && explicitOrgId !== s.organizationId) {
    throw new AppError("FORBIDDEN", "Cross-organization access denied.");
  }
  return { session: s, organizationId: s.organizationId };
}

/** Assert that a record belongs to the caller's org (tenant isolation). */
export function assertSameOrg(recordOrgId: string | null | undefined, callerOrgId: string | null) {
  if (!callerOrgId) return; // superadmin system-wide caller — checked by caller
  if (recordOrgId !== callerOrgId) {
    throw new AppError("FORBIDDEN", "Cross-organization access denied.");
  }
}
