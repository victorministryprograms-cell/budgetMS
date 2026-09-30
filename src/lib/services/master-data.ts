import { prisma } from "../db";
import { audit } from "../audit";
import { requirePermission, requireOrganizationAccess, isSuperAdmin, assertSameOrg } from "../permissions";
import { AppError, toResult } from "../errors";
import { categorySchema, departmentSchema, projectSchema } from "../validations";

function orgScope(session: { role: string; organizationId: string | null }, explicit?: string | null, callerOrg?: string | null) {
  if (isSuperAdmin(session.role)) {
    if (explicit ?? callerOrg) return (explicit ?? callerOrg)!;
    throw new AppError("VALIDATION_ERROR", "Organization is required.");
  }
  if (explicit && explicit !== session.organizationId) throw new AppError("FORBIDDEN", "Cross-organization access denied.");
  return session.organizationId!;
}

// ---- Categories ----
export async function listCategories(orgId?: string | null) {
  return toResult(async () => {
    await requirePermission("category:read");
    const { session, organizationId } = await requireOrganizationAccess(orgId);
    const scope = organizationId ?? session.organizationId;
    if (!scope && !isSuperAdmin(session.role)) throw new AppError("FORBIDDEN", "No organization.");
    const where = scope ? { organizationId: scope } : {};
    return prisma.category.findMany({ where, orderBy: { name: "asc" }, include: { children: true } });
  });
}

export async function createCategory(input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("category:create");
    const data = categorySchema.parse(input);
    const { organizationId } = await requireOrganizationAccess(data.organizationId ?? null);
    const orgId = orgScope(s, data.organizationId, organizationId);
    const dup = await prisma.category.findUnique({ where: { organizationId_code: { organizationId: orgId, code: data.code.toUpperCase() } } });
    if (dup) throw new AppError("CONFLICT", "Category code already exists.");
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent || parent.organizationId !== orgId) throw new AppError("VALIDATION_ERROR", "Invalid parent category.");
    }
    const cat = await prisma.category.create({
      data: { organizationId: orgId, name: data.name, code: data.code.toUpperCase(), description: data.description || null, parentId: data.parentId || null, status: data.status },
    });
    await audit({ organizationId: orgId, userId: s.id, action: "CATEGORY_CREATED", entityType: "Category", entityId: cat.id, newValues: cat });
    return cat;
  });
}

export async function updateCategory(id: string, input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("category:update");
    const { organizationId } = await requireOrganizationAccess();
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Category not found.");
    if (!isSuperAdmin(s.role)) assertSameOrg(existing.organizationId, organizationId);
    const data = categorySchema.partial().parse(input);
    const updated = await prisma.category.update({ where: { id }, data: { name: data.name, description: data.description, status: data.status } });
    await audit({ organizationId: existing.organizationId, userId: s.id, action: "CATEGORY_UPDATED", entityType: "Category", entityId: id, oldValues: existing, newValues: updated });
    return updated;
  });
}

export async function deleteCategory(id: string) {
  return toResult(async () => {
    const s = await requirePermission("category:delete");
    const { organizationId } = await requireOrganizationAccess();
    const existing = await prisma.category.findUnique({ where: { id }, include: { children: true } });
    if (!existing) throw new AppError("NOT_FOUND", "Category not found.");
    if (!isSuperAdmin(s.role)) assertSameOrg(existing.organizationId, organizationId);
    if (existing.children.length > 0) throw new AppError("CONFLICT", "Cannot delete a category with subcategories.");
    await prisma.category.delete({ where: { id } });
    await audit({ organizationId: existing.organizationId, userId: s.id, action: "CATEGORY_UPDATED", entityType: "Category", entityId: id, oldValues: existing });
    return { id };
  });
}

// ---- Departments ----
export async function listDepartments(orgId?: string | null) {
  return toResult(async () => {
    await requirePermission("department:read");
    const { session, organizationId } = await requireOrganizationAccess(orgId);
    const scope = organizationId ?? session.organizationId;
    const where = scope ? { organizationId: scope } : {};
    return prisma.department.findMany({ where, orderBy: { name: "asc" }, include: { manager: { select: { id: true, firstName: true, lastName: true } } } });
  });
}

export async function createDepartment(input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("department:create");
    const data = departmentSchema.parse(input);
    const { organizationId } = await requireOrganizationAccess(data.organizationId ?? null);
    const orgId = orgScope(s, data.organizationId, organizationId);
    const dup = await prisma.department.findUnique({ where: { organizationId_code: { organizationId: orgId, code: data.code.toUpperCase() } } });
    if (dup) throw new AppError("CONFLICT", "Department code already exists.");
    const dept = await prisma.department.create({
      data: { organizationId: orgId, name: data.name, code: data.code.toUpperCase(), description: data.description || null, managerId: data.managerId || null, status: data.status },
    });
    await audit({ organizationId: orgId, userId: s.id, action: "CATEGORY_CREATED", entityType: "Department", entityId: dept.id, newValues: dept });
    return dept;
  });
}

export async function updateDepartment(id: string, input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("department:update");
    const { organizationId } = await requireOrganizationAccess();
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Department not found.");
    if (!isSuperAdmin(s.role)) assertSameOrg(existing.organizationId, organizationId);
    const data = departmentSchema.partial().parse(input);
    const updated = await prisma.department.update({ where: { id }, data: { name: data.name, description: data.description, managerId: data.managerId, status: data.status } });
    await audit({ organizationId: existing.organizationId, userId: s.id, action: "CATEGORY_UPDATED", entityType: "Department", entityId: id, oldValues: existing, newValues: updated });
    return updated;
  });
}

// ---- Projects ----
export async function listProjects(orgId?: string | null) {
  return toResult(async () => {
    await requirePermission("project:read");
    const { session, organizationId } = await requireOrganizationAccess(orgId);
    const scope = organizationId ?? session.organizationId;
    const where = scope ? { organizationId: scope } : {};
    return prisma.project.findMany({ where, orderBy: { name: "asc" } });
  });
}

export async function createProject(input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("project:create");
    const data = projectSchema.parse(input);
    const { organizationId } = await requireOrganizationAccess(data.organizationId ?? null);
    const orgId = orgScope(s, data.organizationId, organizationId);
    const dup = await prisma.project.findUnique({ where: { organizationId_code: { organizationId: orgId, code: data.code.toUpperCase() } } });
    if (dup) throw new AppError("CONFLICT", "Project code already exists.");
    const proj = await prisma.project.create({
      data: { organizationId: orgId, name: data.name, code: data.code.toUpperCase(), description: data.description || null, budgetOwnerId: data.budgetOwnerId || null, status: data.status },
    });
    await audit({ organizationId: orgId, userId: s.id, action: "CATEGORY_CREATED", entityType: "Project", entityId: proj.id, newValues: proj });
    return proj;
  });
}

export async function updateProject(id: string, input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("project:update");
    const { organizationId } = await requireOrganizationAccess();
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Project not found.");
    if (!isSuperAdmin(s.role)) assertSameOrg(existing.organizationId, organizationId);
    const data = projectSchema.partial().parse(input);
    const updated = await prisma.project.update({ where: { id }, data: { name: data.name, description: data.description, budgetOwnerId: data.budgetOwnerId, status: data.status } });
    await audit({ organizationId: existing.organizationId, userId: s.id, action: "CATEGORY_UPDATED", entityType: "Project", entityId: id, oldValues: existing, newValues: updated });
    return updated;
  });
}
