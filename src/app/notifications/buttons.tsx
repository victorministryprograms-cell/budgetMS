"use client";
import { markAllNotifications } from "@/lib/server-actions";
import { useRouter } from "next/navigation";

export function NotifButtons() {
  const router = useRouter();
  return <button className="rounded-lg border px-3 py-1.5 text-xs" onClick={async () => { await markAllNotifications(); router.refresh(); }}>Mark all read</button>;
}
