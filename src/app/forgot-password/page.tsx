"use client";
import { useState } from "react";
import { Input, Label, Button } from "@/components/ui";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setDone(true);
  }
  return (
    <div className="mx-auto max-w-md pt-20">
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold">Reset password</h1>
        {done ? <p className="mt-3 text-sm text-zinc-600">If the account exists, a reset was issued. Check server logs in dev (MVP) or your email.</p> : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button className="w-full">Send reset link</Button>
          </form>
        )}
      </div>
    </div>
  );
}
