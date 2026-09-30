"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { categoryCreate, departmentCreate, projectCreate } from "@/lib/server-actions";
import { Button, Input, Label } from "@/components/ui";

export function MasterForms() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  async function handle(kind: string, fd: FormData) {
    const payload = { name: fd.get("name"), code: fd.get("code"), description: fd.get("description") };
    const r = kind === "cat" ? await categoryCreate(payload) : kind === "dept" ? await departmentCreate(payload) : await projectCreate(payload);
    if (!r.success) setMsg(r.error.message);
    else { setMsg(null); router.refresh(); }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[["cat", "New category"], ["dept", "New department"], ["proj", "New project"]].map(([kind, title]) => (
        <form key={kind} className="space-y-2 rounded-xl border bg-white p-4" onSubmit={(e) => { e.preventDefault(); handle(kind, new FormData(e.currentTarget)); (e.target as HTMLFormElement).reset(); }}>
          <p className="text-sm font-semibold">{title}</p>
          <div><Label>Name</Label><Input name="name" required /></div>
          <div><Label>Code</Label><Input name="code" required /></div>
          <div><Label>Description</Label><Input name="description" /></div>
          <Button className="w-full" type="submit">Create</Button>
        </form>
      ))}
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  );
}
