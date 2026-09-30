import Link from "next/link";
import { listBudgets } from "@/lib/services/budgets";
import { Card, CardHeader, Badge, Button, Empty } from "@/components/ui";

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  const q = await searchParams;
  const r = await listBudgets(null, { search: q.search, status: q.status });
  if (!r.success) return <p className="text-sm text-red-600">{r.error.message}</p>;
  const { items, total } = r.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Budgets <span className="text-sm font-normal text-zinc-500">({total})</span></h1>
        <Link href="/budgets/new"><Button>New budget</Button></Link>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="search" defaultValue={q.search} placeholder="Search name or code…" className="h-9 w-full rounded-lg border border-zinc-300 px-3 text-sm sm:w-64" />
        <select name="status" defaultValue={q.status ?? ""} className="h-9 rounded-lg border border-zinc-300 px-2 text-sm">
          <option value="">All statuses</option>
          {["DRAFT","SUBMITTED","UNDER_REVIEW","APPROVED","REJECTED","ACTIVE","CLOSED","CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button variant="secondary" type="submit">Filter</Button>
      </form>
      {items.length === 0 ? <Empty title="No budgets found" hint="Create your first budget to get started." /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b border-zinc-100 text-left text-xs uppercase text-zinc-500">
                <th className="px-5 py-3">Budget</th><th className="px-3 py-3">Code</th><th className="px-3 py-3">Allocated</th><th className="px-3 py-3">Spent</th><th className="px-3 py-3">Util.</th><th className="px-3 py-3">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3"><Link href={`/budgets/${b.id}`} className="font-medium underline-offset-2 hover:underline">{b.name}</Link></td>
                    <td className="px-3 py-3 font-mono text-xs">{b.budgetCode}</td>
                    <td className="px-3 py-3 tabular-nums">{b.computedAllocated}</td>
                    <td className="px-3 py-3 tabular-nums">{b.computedSpent}</td>
                    <td className="px-3 py-3 tabular-nums">{b.utilization.toFixed(1)}%</td>
                    <td className="px-3 py-3"><Badge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card><CardHeader title="About budgets" subtitle="Totals are computed server-side from budget items. Client totals are never trusted." /></Card>
    </div>
  );
}
