import { prisma } from "../db";
import { audit } from "../audit";
import { hashPassword, newToken, hashToken } from "../auth";
import { requirePermission, requireOrganizationAccess, isSuperAdmin } from "../permissions";
import { AppError, toResult } from "../errors";
import { userSchema } from "../validations";

export async function listUsers(orgId?: string | null, params?: { search?: string; page?: number; pageSize?: number }) {
  return toResult(async () => {
    const s = await requirePermission("user:read");
    const { organizationId } = await requireOrganizationAccess(orgId);
    const page = params?.page ?? 1;
    const pageSize = Math.min(params?.pageSize ?? 10, 100);
    const where: Record<string, unknown> = {};
    // Superadmin without explicit org sees all; admin scoped to own org
    if (organizationId) where.organizationId = organizationId;
    else if (!isSuperAdmin(s.role)) where.organizationId = s.organizationId;
    if (params?.search) {
      where.OR = [
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { role: true, organization: { select: { id: true, name: true, code: true } } },
      }),
    ]);
    return { items: items.map((u) => ({ ...u, passwordHash: undefined })), total, page, pageSize };
  });
}

export async function createUser(input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("user:create");
    const data = userSchema.parse(input);
    const { organizationId } = await requireOrganizationAccess(data.organizationId ?? null);

    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) throw new AppError("NOT_FOUND", "Role not found.");
    // Only superadmin can assign SUPERADMIN role or create users outside own org
    if (role.name === "SUPERADMIN" && !isSuperAdmin(s.role)) {
      throw new AppError("FORBIDDEN", "Only Superadmin can assign the Superadmin role.");
    }
    const targetOrg = organizationId ?? (isSuperAdmin(s.role) ? data.organizationId ?? null : s.organizationId);
    if (!isSuperAdmin(s.role) && targetOrg !== s.organizationId) {
      throw new AppError("FORBIDDEN", "Cross-organization access denied.");
    }
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new AppError("CONFLICT", "A user with this email already exists.");

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        passwordHash: await hashPassword(data.password ?? newToken()),
        roleId: data.roleId,
        organizationId: targetOrg,
        status: data.status,
      },
    });
    await audit({ organizationId: targetOrg, userId: s.id, action: "USER_CREATED", entityType: "User", entityId: user.id, newValues: { email: user.email } });
    return { ...user, passwordHash: undefined };
  });
}

export async function setUserStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
  return toResult(async () => {
    const s = await requirePermission("user:update", "user:deactivate");
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new AppError("NOT_FOUND", "User not found.");
    if (!isSuperAdmin(s.role)) {
      if (target.organizationId !== s.organizationId) throw new AppError("FORBIDDEN", "Cross-organization access denied.");
      if (target.roleId && (await prisma.role.findUnique({ where: { id: target.roleId } }))?.name === "SUPERADMIN") {
        throw new AppError("FORBIDDEN", "Cannot modify a Superadmin.");
      }
    }
    const updated = await prisma.user.update({ where: { id }, data: { status } });
    await audit({
      organizationId: updated.organizationId, userId: s.id,
      action: status === "ACTIVE" ? "USER_UPDATED" : "USER_DEACTIVATED",
      entityType: "User", entityId: id, oldValues: { status: target.status }, newValues: { status },
    });
    if (status !== "ACTIVE") {
      await prisma.session.deleteMany({ where: { userId: id } });
    }
    return { ...updated, passwordHash: undefined };
  });
}

export async function resetUserPassword(id: string) {
  return toResult(async () => {
    const s = await requirePermission("user:update");
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new AppError("NOT_FOUND", "User not found.");
    if (!isSuperAdmin(s.role) && target.organizationId !== s.organizationId) {
      throw new AppError("FORBIDDEN", "Cross-organization access denied.");
    }
    const raw = newToken();
    await prisma.passwordResetToken.create({
      data: { userId: id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await audit({ organizationId: target.organizationId, userId: s.id, action: "USER_UPDATED", entityType: "User", entityId: id, newValues: { passwordReset: true } });
    // In MVP without email server, return token so admin can share it securely out-of-band.
    return { resetToken: raw };
  });
}
