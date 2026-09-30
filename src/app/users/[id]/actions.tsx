"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { userStatus, userResetPassword } from "@/lib/server-actions";
import { Button } from "@/components/ui";

export function UserDetailActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
      {status !== "ACTIVE" && <Button onClick={async () => { const r = await userStatus(id, "ACTIVE"); if (!r.success) setMsg(r.error.message); else router.refresh(); }}>Activate</Button>}
      {status === "ACTIVE" && <Button variant="secondary" onClick={async () => { const r = await userStatus(id, "INACTIVE"); if (!r.success) setMsg(r.error.message); else router.refresh(); }}>Deactivate</Button>}
      <Button variant="secondary" onClick={async () => { const r = await userResetPassword(id); if (!r.success) setMsg(r.error.message); else setMsg(`Reset token: ${(r.data as { resetToken: string }).resetToken}`); }}>Reset password</Button>
      {msg && <p className="w-full text-xs text-zinc-600">{msg}</p>}
    </div>
  );
}
