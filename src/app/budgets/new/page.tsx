"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { budgetCreate } from "@/lib/server-actions";
import { Input, Label, Button } from "@/components/ui";

export default function NewBudgetPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const r = await budgetCreate({
      name: fd.get("name"), description: fd.get("description"),
      budgetCode: fd.get("budgetCode"), periodType: fd.get("periodType"),
      startDate: fd.get("startDate"), endDate: fd.get("endDate"),
      currency: fd.get("currency"), totalAmount: Number(fd.get("totalAmount") ?? 0),
    });
    setLoading(false);
    if (!r.success) { setError(r.error.message); return; }
    router.push(`/budgets/${(r.data as { id: string }).id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">New budget</h1>
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Name</Label><Input name="name" required /></div>
          <div><Label>Code</Label><Input name="budgetCode" required placeholder="B-2026-001" /></div>
          <div><Label>Period</Label><select name="periodType" className="h-9 w-full rounded-lg border px-2 text-sm"><option>MONTHLY</option><option>QUARTERLY</option><option value="YEARLY">YEARLY</option><option>CUSTOM</option></select></div>
          <div><Label>Currency</Label><Input name="currency" defaultValue="USD" maxLength={3} /></div>
          <div><Label>Start</Label><Input name="startDate" type="date" required /></div>
          <div><Label>End</Label><Input name="endDate" type="date" required /></div>
          <div><Label>Total amount</Label><Input name="totalAmount" type="number" min="0" step="0.01" defaultValue="0" /></div>
        </div>
        <div><Label>Description</Label><Input name="description" /></div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <Button disabled={loading} className="w-full">{loading ? "Creating…" : "Create budget"}</Button>
      </form>
    </div>
  );
}
