import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { Card, Badge, Empty } from "@/components/ui";

export default async function ApprovalsPage() {
  const s = await requireAuth();
  const orgFilter = s.role === "SUPERADMIN" ? {} : { organizationId: s.organizationId! };
  const [budgets, txs] = await Promise.all([
    prisma.budget.findMany({ where: { ...orgFilter, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.transaction.findMany({ where: { ...orgFilter, status: "PENDING" }, orderBy: { updatedAt: "desc" }, take: 20 }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Approvals</h1>
      <Card>
        <div className="border-b px-5 py-3 text-sm font-semibold">Budgets awaiting review ({budgets.length})</div>
        {budgets.length === 0 ? <div className="p-5"><Empty title="No budgets pending" /></div> :
          <ul className="divide-y text-sm">{budgets.map((b) => <li key={b.id} className="flex justify-between px-5 py-2.5"><Link href={`/budgets/${b.id}`} className="font-medium hover:underline">{b.name}</Link><Badge status={b.status} /></li>)}</ul>}
      </Card>
      <Card>
        <div className="border-b px-5 py-3 text-sm font-semibold">Transactions awaiting approval ({txs.length})</div>
        {txs.length === 0 ? <div className="p-5"><Empty title="No transactions pending" /></div> :
          <ul className="divide-y text-sm">{txs.map((t) => <li key={t.id} className="flex justify-between px-5 py-2.5"><Link href={`/transactions/${t.id}`} className="font-medium hover:underline">{t.description ?? t.reference ?? t.id.slice(0, 8)} · {t.amount.toString()}</Link><Badge status={t.status} /></li>)}</ul>}
      </Card>
    </div>
  );
}
