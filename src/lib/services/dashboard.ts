import DecimalJS from "decimal.js";
import { prisma } from "../db";
import { requirePermission, requireOrganizationAccess, isSuperAdmin } from "../permissions";
import { toResult } from "../errors";
import { alertLevel } from "../finance";

export async function getAdminDashboard(organizationId?: string | null) {
  return toResult(async () => {
    await requirePermission("budget:read");
    const { session, organizationId: scoped } = await requireOrganizationAccess(organizationId);
    const orgId = scoped ?? session.organizationId;
    if (!orgId) throw new Error("Organization required");
    const [budgets, transactions, items, pendingBudgets, pendingTx] = await Promise.all([
      prisma.budget.findMany({ where: { organizationId: orgId }, include: { items: true } }),
      prisma.transaction.findMany({ where: { organizationId: orgId, status: "APPROVED" } }),
      prisma.budgetItem.findMany({ where: { budget: { organizationId: orgId } }, include: { category: true, department: true } }),
      prisma.budget.count({ where: { organizationId: orgId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.transaction.count({ where: { organizationId: orgId, status: "PENDING" } }),
    ]);

    const totalBudget = budgets.reduce((s, b) => s.plus(b.totalAmount.toString()), new DecimalJS(0));
    const allocated = items.reduce((s, i) => s.plus(i.allocatedAmount.toString()), new DecimalJS(0));
    const spent = items.reduce((s, i) => s.plus(i.spentAmount.toString()), new DecimalJS(0));
    const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s.plus(t.amount.toString()), new DecimalJS(0));
    const expenses = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s.plus(t.amount.toString()), new DecimalJS(0));

    // Spending by category / department from items
    const byCategory = new Map<string, DecimalJS>();
    const byDepartment = new Map<string, DecimalJS>();
    for (const i of items) {
      const c = i.category?.name ?? "Uncategorized";
      const d = i.department?.name ?? "No department";
      byCategory.set(c, (byCategory.get(c) ?? new DecimalJS(0)).plus(i.spentAmount.toString()));
      byDepartment.set(d, (byDepartment.get(d) ?? new DecimalJS(0)).plus(i.spentAmount.toString()));
    }

    // Monthly trend (last 6 months of approved transactions)
    const trend = new Map<string, DecimalJS>();
    for (const t of transactions) {
      const k = `${t.transactionDate.getFullYear()}-${String(t.transactionDate.getMonth() + 1).padStart(2, "0")}`;
      const signed = t.type === "EXPENSE" ? new DecimalJS(t.amount.toString()) : new DecimalJS(0);
      trend.set(k, (trend.get(k) ?? new DecimalJS(0)).plus(signed));
    }

    const overBudget = items
      .map((i) => {
        const a = new DecimalJS(i.allocatedAmount.toString());
        const sp = new DecimalJS(i.spentAmount.toString());
        const util = a.isZero() ? 0 : sp.div(a).times(100).toNumber();
        return { id: i.id, description: i.description, allocated: a.toString(), spent: sp.toString(), utilization: util, level: alertLevel(util) };
      })
      .filter((x) => x.level === "CRITICAL" || x.level === "OVER_BUDGET")
      .slice(0, 10);

    const recentTransactions = await prisma.transaction.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { category: { select: { name: true } } },
    });

    const utilization = allocated.isZero() ? 0 : spent.div(allocated).times(100).toNumber();
    return {
      totalBudget: totalBudget.toString(),
      totalSpent: spent.toString(),
      remaining: allocated.minus(spent).toString(),
      utilization,
      totalIncome: income.toString(),
      totalExpenses: expenses.toString(),
      pendingApprovals: pendingBudgets + pendingTx,
      pendingBudgets,
      pendingTransactions: pendingTx,
      overBudget,
      byCategory: [...byCategory.entries()].map(([name, v]) => ({ name, value: v.toNumber() })),
      byDepartment: [...byDepartment.entries()].map(([name, v]) => ({ name, value: v.toNumber() })),
      trend: [...trend.entries()].sort().map(([month, v]) => ({ month, spent: v.toNumber() })),
      recentTransactions,
    };
  });
}

export async function getSuperadminDashboard() {
  return toResult(async () => {
    await requirePermission("organization:read");
    const [orgs, users, budgets, tx, recentOrgs, recentUsers, recentAudit] = await Promise.all([
      prisma.organization.groupBy({ by: ["status"], _count: true }),
      prisma.user.groupBy({ by: ["status"], _count: true }),
      prisma.budget.aggregate({ _count: true, _sum: { totalAmount: true } }),
      prisma.transaction.aggregate({ _count: true }),
      prisma.organization.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { _count: { select: { users: true, budgets: true } } } }),
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { organization: { select: { name: true } }, role: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    const count = (rows: { _count: number }[]) => rows.reduce((s, r) => s + r._count, 0);
    void isSuperAdmin;
    return {
      totalOrganizations: count(orgs),
      activeOrganizations: orgs.find((o) => o.status === "ACTIVE")?._count ?? 0,
      totalUsers: count(users),
      activeUsers: users.find((u) => u.status === "ACTIVE")?._count ?? 0,
      totalBudgets: budgets._count,
      totalBudgetValue: budgets._sum.totalAmount?.toString() ?? "0",
      totalTransactions: tx._count,
      recentOrgs,
      recentUsers: recentUsers.map((u) => ({ ...u, passwordHash: undefined })),
      recentAudit,
    };
  });
}
