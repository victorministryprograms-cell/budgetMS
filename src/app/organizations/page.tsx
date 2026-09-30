import Link from "next/link";
import { listOrganizations } from "@/lib/services/organizations";
import { Card, Badge, Button, Empty } from "@/components/ui";
import { OrgForm } from "./form";

export default async function OrgsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const q = await searchParams;
  const r = await listOrganizations({ search: q.search });
  if (!r.success) return <p className="text-sm text-red-600">{r.error.message}</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Organizations ({r.data.total})</h1></div>
      <OrgForm />
      <form className="flex flex-wrap gap-2"><input name="search" defaultValue={q.search} placeholder="Search…" className="h-9 w-full rounded-lg border px-3 text-sm sm:w-64" /><Button variant="secondary">Search</Button></form>
      {r.data.items.length === 0 ? <Empty title="No organizations" /> : (
        <Card><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-zinc-500"><th className="px-5 py-3">Name</th><th className="px-3 py-3">Code</th><th className="px-3 py-3">Users</th><th className="px-3 py-3">Budgets</th><th className="px-3 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{r.data.items.map((o) => <tr key={o.id}><td className="px-5 py-2.5"><Link href={`/organizations/${o.id}`} className="font-medium hover:underline">{o.name}</Link></td><td className="px-3 py-2.5 font-mono text-xs">{o.code}</td><td className="px-3 py-2.5">{o._count.users}</td><td className="px-3 py-2.5">{o._count.budgets}</td><td className="px-3 py-2.5"><Badge status={o.status} /></td></tr>)}</tbody></table></div></Card>
      )}
    </div>
  );
}
