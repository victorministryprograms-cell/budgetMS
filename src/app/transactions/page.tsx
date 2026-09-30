import Link from "next/link";
import { listTransactions } from "@/lib/services/transactions";
import { Card, Badge, Button, Empty } from "@/components/ui";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; type?: string }> }) {
  const q = await searchParams;
  const r = await listTransactions(null, { search: q.search, status: q.status, type: q.type });
  if (!r.success) return <p className="text-sm text-red-600">{r.error.message}</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Transactions <span className="text-sm font-normal text-zinc-500">({r.data.total})</span></h1>
        <Link href="/transactions/new"><Button>New transaction</Button></Link>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="search" defaultValue={q.search} placeholder="Search…" className="h-9 w-full rounded-lg border px-3 text-sm sm:w-56" />
        <select name="status" defaultValue={q.status ?? ""} className="h-9 rounded-lg border px-2 text-sm"><option value="">All statuses</option>{["DRAFT","PENDING","APPROVED","REJECTED","CANCELLED"].map((s) => <option key={s}>{s}</option>)}</select>
        <select name="type" defaultValue={q.type ?? ""} className="h-9 rounded-lg border px-2 text-sm"><option value="">All types</option>{["EXPENSE","INCOME","ADJUSTMENT","REFUND"].map((s) => <option key={s}>{s}</option>)}</select>
        <Button variant="secondary" type="submit">Filter</Button>
      </form>
      {r.data.items.length === 0 ? <Empty title="No transactions" /> : (
        <Card><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-zinc-500"><th className="px-5 py-3">Description</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Budget</th><th className="px-3 py-3">Status</th></tr></thead>
          <tbody className="divide-y">{r.data.items.map((t) => (
            <tr key={t.id} className="hover:bg-zinc-50"><td className="px-5 py-2.5"><Link href={`/transactions/${t.id}`} className="font-medium hover:underline">{t.description ?? t.reference ?? t.id.slice(0, 8)}</Link></td><td className="px-3 py-2.5">{t.type}</td><td className="px-3 py-2.5 tabular-nums">{t.amount.toString()}</td><td className="px-3 py-2.5">{t.budget?.budgetCode ?? "—"}</td><td className="px-3 py-2.5"><Badge status={t.status} /></td></tr>
          ))}</tbody>
        </table></div></Card>
      )}
    </div>
  );
}
