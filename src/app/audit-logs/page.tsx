import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { Card, Empty } from "@/components/ui";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requirePermission("audit:read");
  const q = await searchParams;
  const logs = await prisma.auditLog.findMany({
    where: q.search ? { OR: [{ action: { contains: q.search } }, { entityType: { contains: q.search } }] } : {},
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Audit logs</h1>
      <form className="flex flex-wrap gap-2"><input name="search" defaultValue={q.search} placeholder="Search action or entity…" className="h-9 w-full rounded-lg border px-3 text-sm sm:w-72" /><button className="h-9 rounded-lg border px-4 text-sm">Search</button></form>
      {logs.length === 0 ? <Empty title="No audit records" /> : (
        <Card><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-zinc-500"><th className="px-5 py-3">Time</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Entity</th></tr></thead>
        <tbody className="divide-y">{logs.map((l) => <tr key={l.id}><td className="px-5 py-2.5 text-xs">{l.createdAt.toLocaleString()}</td><td className="px-3 py-2.5 font-mono text-xs">{l.action}</td><td className="px-3 py-2.5 text-xs">{l.entityType} {l.entityId?.slice(0, 8)}</td></tr>)}</tbody></table></div></Card>
      )}
    </div>
  );
}
