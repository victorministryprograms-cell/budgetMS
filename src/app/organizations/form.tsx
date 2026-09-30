"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { orgCreate } from "@/lib/server-actions";
import { Button, Input, Label } from "@/components/ui";

export function OrgForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!open) return <Button onClick={() => setOpen(true)}>New organization</Button>;
  return (
    <form className="grid grid-cols-2 gap-3 rounded-xl border bg-white p-4" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const r = await orgCreate({ name: fd.get("name"), code: fd.get("code"), currency: fd.get("currency") || "USD", country: fd.get("country") || "" });
      if (!r.success) { setErr(r.error.message); return; }
      setOpen(false); router.refresh();
    }}>
      <div><Label>Name</Label><Input name="name" required /></div>
      <div><Label>Code</Label><Input name="code" required /></div>
      <div><Label>Currency</Label><Input name="currency" defaultValue="USD" /></div>
      <div><Label>Country</Label><Input name="country" /></div>
      {err && <p className="col-span-2 text-xs text-red-600">{err}</p>}
      <div className="col-span-2 flex gap-2"><Button type="submit">Create</Button><Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  );
}
