import { notFound } from "next/navigation";
import { getTransaction } from "@/lib/services/transactions";
import { Card, CardHeader, Badge } from "@/components/ui";
import { TxActions } from "./actions";

export default async function TxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getTransaction(id);
  if (!r.success) notFound();
  const t = r.data;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div><h1 className="text-xl font-bold">{t.description ?? "Transaction"}</h1><p className="font-mono text-xs text-zinc-500">{t.id} · {t.type} · {t.amount.toString()}</p></div>
        <Badge status={t.status} />
      </div>
      <TxActions id={t.id} status={t.status} />
      <Card><CardHeader title="Details" />
        <dl className="grid grid-cols-2 gap-3 px-5 py-4 text-sm">
          <div><dt className="text-xs text-zinc-500">Vendor</dt><dd>{t.vendor ?? "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Reference</dt><dd>{t.reference ?? "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Budget</dt><dd>{t.budget?.name ?? "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Date</dt><dd>{t.transactionDate.toLocaleString()}</dd></div>
          {t.rejectionReason && <div className="col-span-2"><dt className="text-xs text-zinc-500">Rejection reason</dt><dd className="text-red-700">{t.rejectionReason}</dd></div>}
        </dl>
      </Card>
      <Card><CardHeader title="Approval history" />
        <ul className="divide-y text-sm">{t.approvals.map((a) => <li key={a.id} className="px-5 py-2.5">{a.fromStatus ?? "—"} → <b>{a.toStatus}</b> by {a.user.firstName} {a.comment && <span className="text-zinc-500">· {a.comment}</span>}</li>)}</ul>
      </Card>
    </div>
  );
}
