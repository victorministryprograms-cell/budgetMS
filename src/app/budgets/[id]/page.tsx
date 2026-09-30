import { notFound } from "next/navigation";
import { getBudget } from "@/lib/services/budgets";
import { Card, CardHeader, Badge, Empty } from "@/components/ui";
import { BudgetActions } from "./actions";

export default async function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getBudget(id);
  if (!r.success) notFound();
  const b = r.data;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{b.name} <span className="font-mono text-sm font-normal text-zinc-500">{b.budgetCode}</span></h1>
          <p className="text-xs text-zinc-500">{b.organization.name} · {b.startDate.toLocaleDateString()} → {b.endDate.toLocaleDateString()}</p>
        </div>
        <Badge status={b.status} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[["Allocated", b.computedAllocated], ["Spent", b.computedSpent], ["Remaining", b.computedRemaining], ["Utilization", `${b.utilization.toFixed(1)}%`]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-zinc-500">{l}</p><p className="text-xl font-bold tabular-nums">{v}</p></div>
        ))}
      </div>
      <BudgetActions id={b.id} status={b.status} />
      <Card>
        <CardHeader title="Budget items" subtitle="Server-side totals; spent updates atomically on transaction approval" />
        {b.items.length === 0 ? <div className="p-5"><Empty title="No items yet" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-zinc-500"><th className="px-5 py-3">Description</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Dept</th><th className="px-3 py-3">Allocated</th><th className="px-3 py-3">Spent</th></tr></thead>
              <tbody className="divide-y">{b.items.map((i) => (
                <tr key={i.id}><td className="px-5 py-2.5">{i.description ?? "—"}</td><td className="px-3 py-2.5">{i.category?.name ?? "—"}</td><td className="px-3 py-2.5">{i.department?.name ?? "—"}</td><td className="px-3 py-2.5 tabular-nums">{i.allocatedAmount.toString()}</td><td className="px-3 py-2.5 tabular-nums">{i.spentAmount.toString()}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
      <Card>
        <CardHeader title="Approval history" />
        <ul className="divide-y text-sm">{b.approvals.map((a) => <li key={a.id} className="px-5 py-2.5">{a.fromStatus ?? "—"} → <b>{a.toStatus}</b> by {a.user.firstName} {a.user.lastName} {a.comment && <span className="text-zinc-500">· {a.comment}</span>}</li>)}</ul>
      </Card>
    </div>
  );
}
