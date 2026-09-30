import { getExpenseReport } from "@/lib/services/reports";
import { Card, Badge } from "@/components/ui";

export default async function ExpensesReportPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const q = await searchParams;
  const r = await getExpenseReport({ type: q.type || undefined, status: q.status || undefined });
  if (!r.success) return <p className="text-sm text-red-600">{r.error.message}</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Expense report ({r.data.length})</h1>
        <a href="/api/reports/export?type=expenses" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Export CSV</a>
      </div>
      <form className="flex flex-wrap gap-2">
        <select name="type" defaultValue={q.type ?? ""} className="h-9 rounded-lg border px-2 text-sm"><option value="">All types</option><option>EXPENSE</option><option>INCOME</option><option>ADJUSTMENT</option><option>REFUND</option></select>
        <select name="status" defaultValue={q.status ?? ""} className="h-9 rounded-lg border px-2 text-sm"><option value="">All statuses</option><option>DRAFT</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select>
        <button className="h-9 rounded-lg border px-4 text-sm">Filter</button>
      </form>
      <Card><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
        <thead><tr className="border-b text-left text-xs uppercase text-zinc-500"><th className="px-5 py-3">Date</th><th className="px-3 py-3">Description</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{r.data.map((t) => <tr key={t.id}><td className="px-5 py-2.5">{t.transactionDate.toLocaleDateString()}</td><td className="px-3 py-2.5">{t.description ?? "—"}</td><td className="px-3 py-2.5">{t.type}</td><td className="px-3 py-2.5 tabular-nums">{t.amount.toString()}</td><td className="px-3 py-2.5"><Badge status={t.status} /></td></tr>)}</tbody>
      </table></div></Card>
    </div>
  );
}
