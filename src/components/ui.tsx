import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-amber-200 bg-amber-50 shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-amber-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-amber-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-amber-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-amber-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-amber-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-amber-500">{hint}</p>}
    </div>
  );
}

const badgeColors: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DRAFT: "bg-amber-100 text-amber-700 ring-amber-200",
  SUBMITTED: "bg-blue-50 text-blue-700 ring-blue-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 ring-amber-200",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
  SUSPENDED: "bg-red-50 text-red-700 ring-red-200",
  CLOSED: "bg-amber-100 text-amber-700 ring-amber-200",
  CANCELLED: "bg-amber-100 text-amber-700 ring-amber-200",
  WARNING: "bg-amber-50 text-amber-700 ring-amber-200",
  CRITICAL: "bg-orange-50 text-orange-700 ring-orange-200",
  OVER_BUDGET: "bg-red-50 text-red-700 ring-red-200",
  OK: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function Badge({ status }: { status: string }) {
  const color = badgeColors[status] ?? "bg-amber-100 text-amber-700 ring-amber-200";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", color)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Button({
  children, variant = "primary", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-amber-900 text-white hover:bg-amber-800",
    secondary: "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
    danger: "bg-red-600 text-white hover:bg-red-500",
    ghost: "text-amber-600 hover:bg-amber-100",
  }[variant];
  return (
    <button
      className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:opacity-50", styles, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-9 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/40", props.className)} />;
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold text-amber-700">{children}</label>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-amber-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-amber-400">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-amber-200", className)} />;
}