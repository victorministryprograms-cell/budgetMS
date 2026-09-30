import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, Badge } from "@/components/ui";
import { NotifButtons } from "./buttons";

export default async function NotificationsPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const items = await prisma.notification.findMany({ where: { userId: s.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Notifications</h1><NotifButtons /></div>
      <Card><ul className="divide-y text-sm">
        {items.map((n) => <li key={n.id} className="flex items-center justify-between px-5 py-3"><div><p className="font-medium">{n.title}</p><p className="text-xs text-zinc-500">{n.message}</p></div><Badge status={n.isRead ? "DRAFT" : "PENDING"} /></li>)}
        {items.length === 0 && <li className="px-5 py-6 text-center text-xs text-zinc-500">No notifications.</li>}
      </ul></Card>
    </div>
  );
}
