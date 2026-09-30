"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { txCreate } from "@/lib/server-actions";
import { Input, Label, Button } from "@/components/ui";

export default function NewTransactionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const r = await txCreate({
      type: fd.get("type"), amount: Number(fd.get("amount")),
      description: fd.get("description"), reference: fd.get("reference"),
      vendor: fd.get("vendor"), budgetId: fd.get("budgetId") || null,
      budgetItemId: fd.get("budgetItemId") || null,
      idempotencyKey: fd.get("idempotencyKey") || undefined,
    });
    if (!r.success) { setError(r.error.message); setBusy(false); return; }

    const id = (r.data as { id: string }).id;
    // The attachment needs the transaction id, so it uploads after creation.
    if (file) {
      const upload = new FormData();
      upload.append("file", file);
      upload.append("transactionId", id);
      const res = await fetch("/api/attachments", { method: "POST", body: upload });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        router.push(`/transactions/${id}?uploadError=${encodeURIComponent(json?.error?.message ?? "Attachment upload failed")}`);
        return;
      }
    }
    router.push(`/transactions/${id}`);
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
        <div>
          <Label>Attachment (optional)</Label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.csv,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:bg-white file:px-3 file:py-1.5 file:text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">PDF, PNG, JPEG, WebP, GIF, CSV or text. Up to 2MB.</p>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create transaction"}</Button>
      </form>
    </div>
  );
}
