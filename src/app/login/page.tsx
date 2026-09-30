"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Input, Label, Button } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "Login failed.");
      return;
    }
    // Navigate immediately, then refresh to load dashboard data
    router.push("/dashboard");
    setTimeout(() => router.refresh(), 100);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-4 py-[10vh]">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-zinc-900 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">BudgetMS</h1>
            <p className="text-sm text-zinc-500">Sign in to your workspace</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
          <Button disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <a href="/forgot-password" className="font-medium text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline">Forgot password?</a>
          <span className="text-zinc-400">
            Demo: <b className="font-semibold">admin@demo.com / Admin123!</b>
          </span>
        </div>
      </div>
    </div>
  );
}