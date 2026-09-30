import { listUsers } from "@/lib/services/users";
import { prisma } from "@/lib/db";
import { Card, Badge, Empty } from "@/components/ui";
import { UserForms } from "./forms";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const q = await searchParams;
  const r = await listUsers(null, { search: q.search });
  const roles = await prisma.role.findMany().catch(() => []);
  if (!r.success) return <p className="text-sm text-red-600">{r.error.message}</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Users ({r.data.total})</h1>
      <UserForms roles={roles.map((x) => ({ id: x.id, name: x.name }))} />
      <form className="flex flex-wrap gap-2"><input name="search" defaultValue={q.search} placeholder="Search…" className="h-9 w-full rounded-lg border px-3 text-sm sm:w-64" /><button className="h-9 rounded-lg border px-4 text-sm">Search</button></form>
      {r.data.items.length === 0 ? <Empty title="No users" /> : (
        <Card><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-zinc-500"><th className="px-5 py-3">Name</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Org</th><th className="px-3 py-3">Status</th></tr></thead>
        <tbody className="divide-y">{r.data.items.map((u) => <tr key={u.id}><td className="px-5 py-2.5">{u.firstName} {u.lastName}</td><td className="px-3 py-2.5">{u.email}</td><td className="px-3 py-2.5">{u.role.name}</td><td className="px-3 py-2.5">{u.organization?.name ?? "—"}</td><td className="px-3 py-2.5"><Badge status={u.status} /></td></tr>)}</tbody></table></div></Card>
      )}
    </div>
  );
}
