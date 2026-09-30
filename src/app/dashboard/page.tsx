import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminDashboard, getSuperadminDashboard } from "@/lib/services/dashboard";
import { Stat, Card, CardHeader, Badge } from "@/components/ui";
import { CategoryPie, TrendChart, DeptBars } from "@/components/charts";

export default async function DashboardPage() {
  const s = await getSession();
  if (!s) redirect("/login");

  if (s.role === "SUPERADMIN") {
    const r = await getSuperadminDashboard();
    if (!r.success) return <p>Failed to load.</p>;
    const d = r.data;
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Platform overview</h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Organizations" value={String(d.totalOrganizations)} hint={`${d.activeOrganizations} active`} />
          <Stat label="Users" value={String(d.totalUsers)} hint={`${d.activeUsers} active`} />
          <Stat label="Budgets" value={String(d.totalBudgets)} hint={`${d.totalBudgetValue} total value`} />
          <Stat label="Transactions" value={String(d.totalTransactions)} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader title="Recent organizations" /><ul className="divide-y text-sm">{d.recentOrgs.map((o) => <li key={o.id} className="flex justify-between px-5 py-2.5"><span>{o.name} <span className="text-zinc-400">· {o.code}</span></span><Badge status={o.status} /></li>)}</ul></Card>
          <Card><CardHeader title="Recent audit activity" /><ul className="divide-y text-sm">{d.recentAudit.map((a) => <li key={a.id} className="px-5 py-2.5"><span className="font-medium">{a.action}</span> <span className="text-zinc-500">{a.entityType} {a.createdAt.toLocaleString()}</span></li>)}</ul></Card>
        </div>
      </div>
    );
  }

  const r = await getAdminDashboard();
  if (!r.success) return <p>Failed to load dashboard.</p>;
  const d = r.data;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total budget" value={d.totalBudget} />
        <Stat label="Spent" value={d.totalSpent} hint={`${d.utilization.toFixed(1)}% utilized`} />
        <Stat label="Remaining" value={d.remaining} />
        <Stat label="Pending approvals" value={String(d.pendingApprovals)} hint={`${d.pendingBudgets} budgets · ${d.pendingTransactions} transactions`} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Income" value={d.totalIncome} />
        <Stat label="Expenses" value={d.totalExpenses} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><h3 className="mb-3 text-sm font-semibold">Spending by category</h3><CategoryPie data={d.byCategory} /></Card>
        <Card className="p-5"><h3 className="mb-3 text-sm font-semibold">Monthly spending trend</h3><TrendChart data={d.trend} /></Card>
        <Card className="p-5"><h3 className="mb-3 text-sm font-semibold">Spending by department</h3><DeptBars data={d.byDepartment} /></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Over-budget items" subtitle="Critical or exceeded" />
          <ul className="divide-y text-sm">
            {d.overBudget.length === 0 && <li className="px-5 py-3 text-xs text-zinc-500">Nothing over budget.</li>}
            {d.overBudget.map((o) => <li key={o.id} className="flex items-center justify-between px-5 py-2.5"><span>{o.description ?? o.id}</span><Badge status={o.level} /></li>)}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Recent transactions" />
          <ul className="divide-y text-sm">
            {d.recentTransactions.map((t) => <li key={t.id} className="flex justify-between px-5 py-2.5"><span>{t.description ?? t.type} <span className="text-zinc-400">· {t.amount.toString()}</span></span><Badge status={t.status} /></li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
