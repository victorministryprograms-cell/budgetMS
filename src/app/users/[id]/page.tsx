import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardHeader, Badge } from "@/components/ui";
import { UserDetailActions } from "./actions";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSession();
  if (!me) notFound();
  const u = await prisma.user.findUnique({ where: { id }, include: { role: true, organization: true } });
  if (!u) notFound();
  if (me.role !== "SUPERADMIN" && u.organizationId !== me.organizationId) notFound();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">{u.firstName} {u.lastName}</h1><Badge status={u.status} /></div>
      <Card><CardHeader title={u.email} subtitle={`${u.role.name} · ${u.organization?.name ?? "No organization"}`} /></Card>
      <UserDetailActions id={u.id} status={u.status} />
    </div>
  );
}
