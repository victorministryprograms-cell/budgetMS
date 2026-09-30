"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { userCreate } from "@/lib/server-actions";
import { Button, Input, Label } from "@/components/ui";

export function UserForms({ roles }: { roles: { id: string; name: string }[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="grid grid-cols-2 gap-3 rounded-xl border bg-white p-4 md:grid-cols-3" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const r = await userCreate({ firstName: fd.get("firstName"), lastName: fd.get("lastName"), email: fd.get("email"), password: fd.get("password"), roleId: fd.get("roleId") });
      if (!r.success) { setErr(r.error.message); return; }
      (e.target as HTMLFormElement).reset(); router.refresh();
    }}>
      <div><Label>First name</Label><Input name="firstName" required /></div>
      <div><Label>Last name</Label><Input name="lastName" required /></div>
      <div><Label>Email</Label><Input name="email" type="email" required /></div>
      <div><Label>Password (min 8)</Label><Input name="password" type="password" required minLength={8} /></div>
      <div><Label>Role</Label><select name="roleId" className="h-9 w-full rounded-lg border px-2 text-sm">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
      <div className="flex items-end"><Button type="submit" className="w-full">Create user</Button></div>
      {err && <p className="col-span-full text-xs text-red-600">{err}</p>}
    </form>
  );
}
