import { notFound } from "next/navigation";
import { getOrganization } from "@/lib/services/organizations";
import { Card, CardHeader, Badge } from "@/components/ui";

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getOrganization(id);
  if (!r.success) notFound();
  const o = r.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">{o.name} <span className="font-mono text-sm font-normal text-zinc-500">{o.code}</span></h1><Badge status={o.status} /></div>
      <div className="grid grid-cols-3 gap-4">
        {[["Users", String(o._count.users)], ["Budgets", String(o._count.budgets)], ["Transactions", String(o._count.transactions)]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-white p-4"><p className="text-xs uppercase text-zinc-500">{l}</p><p className="text-xl font-bold">{v}</p></div>
        ))}
      </div>
      <Card><CardHeader title="Details" /><dl className="grid grid-cols-2 gap-3 px-5 py-4 text-sm">
        <div><dt className="text-xs text-zinc-500">Email</dt><dd>{o.email ?? "—"}</dd></div>
        <div><dt className="text-xs text-zinc-500">Currency</dt><dd>{o.currency}</dd></div>
        <div><dt className="text-xs text-zinc-500">Country</dt><dd>{o.country ?? "—"}</dd></div>
        <div><dt className="text-xs text-zinc-500">Timezone</dt><dd>{o.timezone}</dd></div>
      </dl></Card>
    </div>
  );
}
