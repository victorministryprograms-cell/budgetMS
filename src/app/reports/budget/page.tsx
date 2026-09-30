import { getBudgetSummaryReport, toCSV } from "@/lib/services/reports";
import { Card, Badge } from "@/components/ui";

export default async function BudgetReportPage() {
  const r = await getBudgetSummaryReport({});
  if (!r.success) return <p className="text-sm text-red-600">{r.error.message}</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Budget summary</h1>
        <a href="/api/reports/export?type=budget" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Export CSV</a>
      </div>
      <Card><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
        <thead><tr className="border-b text-left text-xs uppercase text-zinc-500"><th className="px-5 py-3">Budget</th><th className="px-3 py-3">Allocated</th><th className="px-3 py-3">Spent</th><th className="px-3 py-3">Remaining</th><th className="px-3 py-3">Util.</th><th className="px-3 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{r.data.map((b) => <tr key={b.budgetId}><td className="px-5 py-2.5 font-medium">{b.name}</td><td className="px-3 py-2.5 tabular-nums">{b.allocated}</td><td className="px-3 py-2.5 tabular-nums">{b.spent}</td><td className="px-3 py-2.5 tabular-nums">{b.remaining}</td><td className="px-3 py-2.5">{b.utilization.toFixed(1)}%</td><td className="px-3 py-2.5"><Badge status={b.status} /></td></tr>)}</tbody>
      </table></div></Card>
    </div>
  );
}

export async function budgetReportCSV() {
  const r = await getBudgetSummaryReport({});
  if (!r.success) return "";
  return toCSV(r.data.map((b) => ({ budget: b.name, code: b.budgetCode, allocated: b.allocated, spent: b.spent, remaining: b.remaining, utilization: b.utilization.toFixed(2), status: b.status })));
}
