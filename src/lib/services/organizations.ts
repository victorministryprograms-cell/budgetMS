import { prisma } from "../db";
import { audit } from "../audit";
import { requirePermission } from "../permissions";
import { AppError, toResult } from "../errors";
import { organizationSchema } from "../validations";

export async function listOrganizations(params?: { search?: string; status?: string; page?: number; pageSize?: number }) {
  return toResult(async () => {
    await requirePermission("organization:read");
    const page = params?.page ?? 1;
    const pageSize = Math.min(params?.pageSize ?? 10, 100);
    const where: Record<string, unknown> = {};
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search } },
        { code: { contains: params.search } },
      ];
    }
    if (params?.status) where.status = params.status;
    const [total, items] = await Promise.all([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { users: true, budgets: true } } },
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function createOrganization(input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("organization:create");
    const data = organizationSchema.parse(input);
    const existing = await prisma.organization.findUnique({ where: { code: data.code } });
    if (existing) throw new AppError("CONFLICT", "Organization code already exists.");
    const org = await prisma.organization.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        country: data.country || null,
        currency: data.currency,
        timezone: data.timezone,
        status: data.status,
      },
    });
    await audit({ userId: s.id, action: "ORGANIZATION_CREATED", entityType: "Organization", entityId: org.id, newValues: org });
    return org;
  });
}

export async function updateOrganization(id: string, input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("organization:update");
    const data = organizationSchema.partial().parse(input);
    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Organization not found.");
    const org = await prisma.organization.update({ where: { id }, data: {
      ...data,
      code: data.code ? data.code.toUpperCase() : undefined,
    } });
    await audit({ userId: s.id, action: "ORGANIZATION_UPDATED", entityType: "Organization", entityId: id, oldValues: existing, newValues: org });
    return org;
  });
}

export async function getOrganization(id: string) {
  return toResult(async () => {
    const s = await requirePermission("organization:read");
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, budgets: true, transactions: true } },
      },
    });
    if (!org) throw new AppError("NOT_FOUND", "Organization not found.");
    void s;
    return org;
  });
}
