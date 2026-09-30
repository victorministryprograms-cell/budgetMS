"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input, Label, Button } from "@/components/ui";
import { Suspense } from "react";

function Form() {
  const q = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: q.get("token"), password }) });
    const j = await res.json();
    if (!j.success) { setError(j.error?.message ?? "Reset failed"); return; }
    router.push("/login");
  }
  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div><Label>New password (min 8 chars)</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <Button className="w-full">Update password</Button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <div className="mx-auto max-w-md pt-20">
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold">Choose a new password</h1>
        <Suspense><Form /></Suspense>
      </div>
    </div>
  );
}
