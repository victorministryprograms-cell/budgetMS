"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { txCreate } from "@/lib/server-actions";
import { Input, Label, Button } from "@/components/ui";

export default function NewTransactionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await txCreate({
      type: fd.get("type"), amount: Number(fd.get("amount")),
      description: fd.get("description"), reference: fd.get("reference"),
      vendor: fd.get("vendor"), budgetId: fd.get("budgetId") || null,
      budgetItemId: fd.get("budgetItemId") || null,
      idempotencyKey: fd.get("idempotencyKey") || undefined,
    });
    if (!r.success) { setError(r.error.message); return; }
    router.push(`/transactions/${(r.data as { id: string }).id}`);
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">New transaction</h1>
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Type</Label><select name="type" className="h-9 w-full rounded-lg border px-2 text-sm"><option>EXPENSE</option><option>INCOME</option><option>ADJUSTMENT</option><option>REFUND</option></select></div>
          <div><Label>Amount</Label><Input name="amount" type="number" min="0.01" step="0.01" required /></div>
          <div><Label>Reference</Label><Input name="reference" /></div>
          <div><Label>Vendor</Label><Input name="vendor" /></div>
          <div><Label>Budget ID (optional)</Label><Input name="budgetId" placeholder="paste budget id" /></div>
          <div><Label>Budget item ID (optional)</Label><Input name="budgetItemId" placeholder="paste item id" /></div>
        </div>
        <div><Label>Description</Label><Input name="description" /></div>
        <div><Label>Idempotency key (optional, prevents duplicates)</Label><Input name="idempotencyKey" /></div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button className="w-full">Create transaction</Button>
      </form>
    </div>
  );
}
