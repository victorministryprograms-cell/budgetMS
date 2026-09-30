import DecimalJS from "decimal.js";
import { prisma } from "../db";
import { audit } from "../audit";
import { notifyOrgUsers } from "../notifications";
import { requirePermission, requireOrganizationAccess, isSuperAdmin, assertSameOrg } from "../permissions";
import { AppError, toResult } from "../errors";
import { budgetSchema, budgetItemSchema } from "../validations";
import { assertBudgetTransition, type BudgetStatus } from "../workflows";
import { remainingAmount, utilizationPercentage } from "../finance";

export async function listBudgets(orgId?: string | null, params?: { search?: string; status?: string; page?: number; pageSize?: number }) {
  return toResult(async () => {
    await requirePermission("budget:read");
    const { organizationId, session } = await requireOrganizationAccess(orgId);
    const scopeOrg = organizationId ?? (isSuperAdmin(session.role) ? undefined : session.organizationId!);
    const page = params?.page ?? 1;
    const pageSize = Math.min(params?.pageSize ?? 10, 100);
    const where: Record<string, unknown> = {};
    if (scopeOrg) where.organizationId = scopeOrg;
    if (params?.status) where.status = params.status;
    if (params?.search) {
      where.AND = [
        ...(scopeOrg ? [{ organizationId: scopeOrg }] : []),
        ...(params.status ? [{ status: params.status }] : []),
        { OR: [
          { name: { contains: params.search } },
          { budgetCode: { contains: params.search } },
        ] },
      ];
      delete where.organizationId;
      delete where.status;
    }
    const [total, items] = await Promise.all([
      prisma.budget.count({ where }),
      prisma.budget.findMany({
        where, orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize, take: pageSize,
        include: {
          organization: { select: { id: true, name: true, code: true } },
          items: true,
        },
      }),
    ]);
    const enriched = items.map((b) => {
      const allocated = b.items.reduce((s, i) => s.plus(i.allocatedAmount.toString()), new DecimalJS(0));
      const spent = b.items.reduce((s, i) => s.plus(i.spentAmount.toString()), new DecimalJS(0));
      return {
        ...b,
        computedAllocated: allocated.toString(),
        computedSpent: spent.toString(),
        computedRemaining: allocated.minus(spent).toString(),
        utilization: allocated.isZero() ? 0 : spent.div(allocated).times(100).toNumber(),
      };
    });
    return { items: enriched, total, page, pageSize };
  });
}

export async function getBudget(id: string) {
  return toResult(async () => {
    await requirePermission("budget:read");
    const { session, organizationId } = await requireOrganizationAccess();
    const b = await prisma.budget.findUnique({
      where: { id },
      include: {
        items: { include: { category: true, department: true, project: true } },
        approvals: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: "desc" } },
        organization: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!b) throw new AppError("NOT_FOUND", "Budget not found.");
    if (!isSuperAdmin(session.role)) assertSameOrg(b.organizationId, organizationId);
    const allocated = b.items.reduce((s, i) => s.plus(i.allocatedAmount.toString()), new DecimalJS(0));
    const spent = b.items.reduce((s, i) => s.plus(i.spentAmount.toString()), new DecimalJS(0));
    return {
      ...b,
      computedAllocated: allocated.toString(),
      computedSpent: spent.toString(),
      computedRemaining: allocated.minus(spent).toString(),
      utilization: allocated.isZero() ? 0 : spent.div(allocated).times(100).toNumber(),
    };
  });
}

export async function createBudget(input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("budget:create");
    const data = budgetSchema.parse(input);
    const { organizationId } = await requireOrganizationAccess(data.organizationId ?? null);
    const orgId = organizationId ?? s.organizationId;
    if (!orgId) throw new AppError("VALIDATION_ERROR", "Organization is required.");
    const dup = await prisma.budget.findUnique({ where: { organizationId_budgetCode: { organizationId: orgId, budgetCode: data.budgetCode.toUpperCase() } } });
    if (dup) throw new AppError("CONFLICT", "Budget code already exists in this organization.");
    const budget = await prisma.budget.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description || null,
        budgetCode: data.budgetCode.toUpperCase(),
        periodType: data.periodType,
        startDate: data.startDate,
        endDate: data.endDate,
        currency: data.currency,
        totalAmount: data.totalAmount,
        status: "DRAFT",
        createdById: s.id,
      },
    });
    await audit({ organizationId: orgId, userId: s.id, action: "BUDGET_CREATED", entityType: "Budget", entityId: budget.id, newValues: budget });
    return budget;
  });
}

export async function updateBudget(id: string, input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("budget:update");
    const { organizationId } = await requireOrganizationAccess();
    const existing = await prisma.budget.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Budget not found.");
    if (!isSuperAdmin(s.role)) assertSameOrg(existing.organizationId, organizationId);
    if (!["DRAFT", "REJECTED"].includes(existing.status)) {
      throw new AppError("INVALID_STATUS", `Budget in status ${existing.status} cannot be edited.`);
    }
    const data = budgetSchema.partial().parse(input);
    const updated = await prisma.budget.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        periodType: data.periodType,
        startDate: data.startDate,
        endDate: data.endDate,
        currency: data.currency,
        totalAmount: data.totalAmount !== undefined ? data.totalAmount : undefined,
      },
    });
    await audit({ organizationId: existing.organizationId, userId: s.id, action: "BUDGET_UPDATED", entityType: "Budget", entityId: id, oldValues: existing, newValues: updated });
    return updated;
  });
}

export async function addBudgetItem(input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("budget:update");
    const { organizationId } = await requireOrganizationAccess();
    const data = budgetItemSchema.parse(input);
    const budget = await prisma.budget.findUnique({ where: { id: data.budgetId }, include: { organization: true } });
    if (!budget) throw new AppError("NOT_FOUND", "Budget not found.");
    if (!isSuperAdmin(s.role)) assertSameOrg(budget.organizationId, organizationId);
    if (!["DRAFT", "REJECTED"].includes(budget.status)) {
      throw new AppError("INVALID_STATUS", "Items can only be added to DRAFT or REJECTED budgets.");
    }
    const item = await prisma.budgetItem.create({
      data: {
        budgetId: data.budgetId,
        categoryId: data.categoryId || null,
        departmentId: data.departmentId || null,
        projectId: data.projectId || null,
        description: data.description || null,
        allocatedAmount: data.allocatedAmount,
      },
    });
    // Recompute server-side total
    const items = await prisma.budgetItem.findMany({ where: { budgetId: data.budgetId } });
    const total = items.reduce((sum, i) => sum.plus(i.allocatedAmount.toString()), new DecimalJS(0));
    await prisma.budget.update({ where: { id: data.budgetId }, data: { totalAmount: Math.round(total.toNumber()) } });
    await audit({ organizationId: budget.organizationId, userId: s.id, action: "BUDGET_UPDATED", entityType: "BudgetItem", entityId: item.id, newValues: item });
    return item;
  });
}

async function transitionBudget(id: string, to: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ACTIVE" | "CLOSED" | "CANCELLED" | "DRAFT", comment?: string, perm?: string) {
  return toResult(async () => {
    const s = await requirePermission(perm ?? "budget:update");
    const { organizationId } = await requireOrganizationAccess();
    const existing = await prisma.budget.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Budget not found.");
    if (!isSuperAdmin(s.role)) assertSameOrg(existing.organizationId, organizationId);
    if (to === "REJECTED" && !comment) throw new AppError("VALIDATION_ERROR", "Rejection reason is required.");
    try {
      assertBudgetTransition(existing.status as BudgetStatus, to);
    } catch {
      throw new AppError("INVALID_STATUS", `Invalid budget transition: ${existing.status} → ${to}`);
    }
    const updated = await prisma.budget.update({
      where: { id },
      data: {
        status: to,
        rejectionReason: to === "REJECTED" ? comment : to === "DRAFT" ? null : existing.rejectionReason,
        approvedById: to === "APPROVED" ? s.id : existing.approvedById,
        approvedAt: to === "APPROVED" ? new Date() : existing.approvedAt,
      },
    });
    await prisma.budgetApproval.create({
      data: { budgetId: id, userId: s.id, fromStatus: existing.status, toStatus: to, comment: comment ?? null },
    });
    const action = to === "SUBMITTED" ? "BUDGET_SUBMITTED" : to === "APPROVED" ? "BUDGET_APPROVED" : to === "REJECTED" ? "BUDGET_REJECTED" : "BUDGET_UPDATED";
    await audit({ organizationId: existing.organizationId, userId: s.id, action, entityType: "Budget", entityId: id, oldValues: { status: existing.status }, newValues: { status: to } });
    await notifyOrgUsers(existing.organizationId, {
      title: `Budget ${to.toLowerCase()}`,
      message: `Budget "${existing.name}" is now ${to}.`,
      type: to === "REJECTED" ? "WARNING" : "INFO",
      link: `/budgets/${id}`,
      excludeUserId: s.id,
    });
    void remainingAmount;
    void utilizationPercentage;
    return updated;
  });
}

export const submitBudget = (id: string) => transitionBudget(id, "SUBMITTED", undefined, "budget:submit");
export const reviewBudget = (id: string) => transitionBudget(id, "UNDER_REVIEW", undefined, "budget:update");
export const approveBudget = (id: string, comment?: string) => transitionBudget(id, "APPROVED", comment, "budget:approve");
export const rejectBudget = (id: string, reason: string) => transitionBudget(id, "REJECTED", reason, "budget:reject");
export const activateBudget = (id: string) => transitionBudget(id, "ACTIVE", undefined, "budget:approve");
export const closeBudget = (id: string) => transitionBudget(id, "CLOSED", undefined, "budget:update");
