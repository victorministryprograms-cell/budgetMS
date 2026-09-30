"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { txSubmit, txApprove, txReject } from "@/lib/server-actions";
import { Button } from "@/components/ui";

export function TxActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  async function run(fn: () => Promise<{ success: boolean; error?: { message: string } }>) {
    const r = await fn();
    if (!r.success) setMsg(r.error?.message ?? "Failed");
    else router.refresh();
  }
  return (
    <div className="flex gap-2 rounded-xl border bg-white p-4">
      {status === "DRAFT" && <Button onClick={() => run(() => txSubmit(id))}>Submit for approval</Button>}
      {status === "PENDING" && (<>
        <Button onClick={() => run(() => txApprove(id))}>Approve (updates budget)</Button>
        <Button variant="danger" onClick={() => { const reason = prompt("Rejection reason:"); if (reason) run(() => txReject(id, reason)); }}>Reject</Button>
      </>)}
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  );
}
