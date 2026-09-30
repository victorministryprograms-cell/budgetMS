import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { Card, CardHeader } from "@/components/ui";

export default async function RolesPage() {
  await requirePermission("role:read");
  const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Roles & permissions</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((r) => (
          <Card key={r.id}><CardHeader title={`${r.name} (${r._count.users} users)`} subtitle={r.description ?? ""} />
            <div className="flex flex-wrap gap-1.5 p-5">{r.permissions.map((p) => <span key={p.permissionId} className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px]">{p.permission.key}</span>)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
