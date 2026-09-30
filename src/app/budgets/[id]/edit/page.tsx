"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { budgetUpdate } from "@/lib/server-actions";
import { Input, Label, Button } from "@/components/ui";

export default function EditBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { id } = await params;
    const fd = new FormData(e.currentTarget);
    const r = await budgetUpdate(id, { name: fd.get("name"), description: fd.get("description"), totalAmount: Number(fd.get("totalAmount")) });
    if (!r.success) { setError(r.error.message); return; }
    router.push(`/budgets/${id}`);
  }
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Edit budget</h1>
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-6">
        <div><Label>Name</Label><Input name="name" required /></div>
        <div><Label>Description</Label><Input name="description" /></div>
        <div><Label>Total amount (recalculated from items on item add)</Label><Input name="totalAmount" type="number" min="0" step="0.01" /></div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button className="w-full">Save</Button>
      </form>
    </div>
  );
}
