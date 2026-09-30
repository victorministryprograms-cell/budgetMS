import DecimalJS from "decimal.js";
import { prisma } from "../db";
import { requirePermission, requireOrganizationAccess, isSuperAdmin } from "../permissions";
import { toResult } from "../errors";
import { utilizationPercentage, variance } from "../finance";

export type ReportFilters = {
  organizationId?: string | null;
  from?: Date;
  to?: Date;
  categoryId?: string;
  departmentId?: string;
  projectId?: string;
  budgetId?: string;
  status?: string;
  type?: string;
};

function scopeWhere(f: ReportFilters, orgId: string | undefined) {
  const where: Record<string, unknown> = {};
  if (orgId) where.organizationId = orgId;
  if (f.budgetId) where.budgetId = f.budgetId;
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.departmentId) where.departmentId = f.departmentId;
  if (f.projectId) where.projectId = f.projectId;
  if (f.status) where.status = f.status;
  if (f.type) where.type = f.type;
  if (f.from || f.to) {
    where.transactionDate = {
      ...(f.from ? { gte: f.from } : {}),
      ...(f.to ? { lte: f.to } : {}),
    };
  }
  return where;
}

export async function getBudgetSummaryReport(filters: ReportFilters) {
  return toResult(async () => {
    await requirePermission("report:read");
    const { session, organizationId } = await requireOrganizationAccess(filters.organizationId ?? null);
    const scope = organizationId ?? (isSuperAdmin(session.role) ? undefined : session.organizationId!);
    const budgets = await prisma.budget.findMany({
      where: { ...(scope ? { organizationId: scope } : {}) },
      include: { items: true, organization: { select: { name: true, code: true } } },
    });
    return budgets.map((b) => {
      const allocated = b.items.reduce((s, i) => s.plus(i.allocatedAmount.toString()), new DecimalJS(0));
      const spent = b.items.reduce((s, i) => s.plus(i.spentAmount.toString()), new DecimalJS(0));
      const rem = allocated.minus(spent);
      return {
        budgetId: b.id, budgetCode: b.budgetCode, name: b.name,
        organization: b.organization, status: b.status,
        allocated: allocated.toString(), spent: spent.toString(), remaining: rem.toString(),
        utilization: utilizationPercentage(allocated.toString(), spent.toString()),
      };
    });
  });
}

export async function getExpenseReport(filters: ReportFilters) {
  return toResult(async () => {
    await requirePermission("report:read");
    const { session, organizationId } = await requireOrganizationAccess(filters.organizationId ?? null);
    const scope = organizationId ?? (isSuperAdmin(session.role) ? undefined : session.organizationId!);
    const where = scopeWhere(filters, scope);
    const items = await prisma.transaction.findMany({
      where, orderBy: { transactionDate: "desc" }, take: 500,
      include: { category: true, department: true, project: true, budget: { select: { name: true, budgetCode: true } } },
    });
    return items;
  });
}

export async function getDepartmentReport(filters: ReportFilters) {
  return toResult(async () => {
    await requirePermission("report:read");
    const { session, organizationId } = await requireOrganizationAccess(filters.organizationId ?? null);
    const scope = organizationId ?? (isSuperAdmin(session.role) ? undefined : session.organizationId!);
    const depts = await prisma.department.findMany({
      where: scope ? { organizationId: scope } : {},
      include: { budgetItems: true },
    });
    void filters;
    return depts.map((d) => {
      const allocated = d.budgetItems.reduce((s, i) => s.plus(i.allocatedAmount.toString()), new DecimalJS(0));
      const spent = d.budgetItems.reduce((s, i) => s.plus(i.spentAmount.toString()), new DecimalJS(0));
      return {
        departmentId: d.id, name: d.name, code: d.code,
        allocated: allocated.toString(), spent: spent.toString(),
        remaining: allocated.minus(spent).toString(),
        utilization: utilizationPercentage(allocated.toString(), spent.toString()),
      };
    });
  });
}

export async function getCategoryReport(filters: ReportFilters) {
  return toResult(async () => {
    await requirePermission("report:read");
    const { session, organizationId } = await requireOrganizationAccess(filters.organizationId ?? null);
    const scope = organizationId ?? (isSuperAdmin(session.role) ? undefined : session.organizationId!);
    const cats = await prisma.category.findMany({
      where: scope ? { organizationId: scope } : {},
      include: { budgetItems: true },
    });
    void filters;
    return cats.map((c) => {
      const allocated = c.budgetItems.reduce((s, i) => s.plus(i.allocatedAmount.toString()), new DecimalJS(0));
      const spent = c.budgetItems.reduce((s, i) => s.plus(i.spentAmount.toString()), new DecimalJS(0));
      return {
        categoryId: c.id, name: c.name, code: c.code,
        allocated: allocated.toString(), spent: spent.toString(),
        remaining: allocated.minus(spent).toString(),
        utilization: utilizationPercentage(allocated.toString(), spent.toString()),
      };
    });
  });
}

export async function getVarianceReport(filters: ReportFilters) {
  return toResult(async () => {
    await requirePermission("report:read");
    const { session, organizationId } = await requireOrganizationAccess(filters.organizationId ?? null);
    const scope = organizationId ?? (isSuperAdmin(session.role) ? undefined : session.organizationId!);
    const budgets = await prisma.budget.findMany({
      where: { ...(scope ? { organizationId: scope } : {}) },
      include: { items: true },
    });
    return budgets.map((b) => {
      const allocated = b.items.reduce((s, i) => s.plus(i.allocatedAmount.toString()), new DecimalJS(0));
      const spent = b.items.reduce((s, i) => s.plus(i.spentAmount.toString()), new DecimalJS(0));
      const v = variance(allocated.toString(), spent.toString());
      return {
        budgetId: b.id, name: b.name, budgetCode: b.budgetCode,
        budgeted: allocated.toString(), actual: spent.toString(),
        variance: v.variance.toString(), variancePct: v.variancePct,
      };
    });
  });
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
