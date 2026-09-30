"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { budgetSubmit, budgetReview, budgetApprove, budgetReject, budgetActivate, budgetClose, budgetAddItem } from "@/lib/server-actions";
import { Button, Input } from "@/components/ui";

export function BudgetActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  async function run(fn: () => Promise<{ success: boolean; error?: { message: string } }>) {
    setMsg(null);
    const r = await fn();
    if (!r.success) setMsg(r.error?.message ?? "Failed");
    else router.refresh();
  }
  const editable = status === "DRAFT" || status === "REJECTED";
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
      {status === "DRAFT" && <Button onClick={() => run(() => budgetSubmit(id))}>Submit</Button>}
      {status === "SUBMITTED" && <Button onClick={() => run(() => budgetReview(id))}>Start review</Button>}
      {status === "UNDER_REVIEW" && (<>
        <Button onClick={() => run(() => budgetApprove(id))}>Approve</Button>
        <Button variant="danger" onClick={() => { const reason = prompt("Rejection reason:"); if (reason) run(() => budgetReject(id, reason)); }}>Reject</Button>
      </>)}
      {status === "APPROVED" && <Button onClick={() => run(() => budgetActivate(id))}>Activate</Button>}
      {status === "ACTIVE" && <Button variant="secondary" onClick={() => run(() => budgetClose(id))}>Close</Button>}
      {editable && <AddItemForm budgetId={id} onDone={() => router.refresh()} />}
      {msg && <p className="w-full text-xs text-red-600">{msg}</p>}
    </div>
  );
}

function AddItemForm({ budgetId, onDone }: { budgetId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!open) return <Button variant="secondary" onClick={() => setOpen(true)}>Add item</Button>;
  return (
    <form
      className="flex w-full flex-wrap items-end gap-2 border-t pt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const r = await budgetAddItem({ budgetId, description: fd.get("description"), allocatedAmount: Number(fd.get("amount")) });
        if (!r.success) { setErr(r.error.message); return; }
        setOpen(false); onDone();
      }}
    >
      <div><Input name="description" placeholder="Description" required /></div>
      <div><Input name="amount" type="number" min="0" step="0.01" placeholder="Amount" required /></div>
      <Button type="submit">Save item</Button>
      <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
      {err && <p className="w-full text-xs text-red-600">{err}</p>}
    </form>
  );
}
