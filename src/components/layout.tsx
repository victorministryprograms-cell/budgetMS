import Link from "next/link";
import { Bell } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MobileNav } from "@/components/mobile-nav";

const SUPERADMIN_NAV = [
  { href: "/dashboard", label: "Dashboard", perm: null },
  { href: "/organizations", label: "Organizations", perm: "organization:read" },
  { href: "/users", label: "Users", perm: "user:read" },
  { href: "/roles", label: "Roles & Permissions", perm: "role:read" },
  { href: "/budgets", label: "Budgets", perm: "budget:read" },
  { href: "/transactions", label: "Transactions", perm: "transaction:read" },
  { href: "/reports", label: "Reports", perm: "report:read" },
  { href: "/audit-logs", label: "Audit Logs", perm: "audit:read" },
  { href: "/settings", label: "Settings", perm: "settings:read" },
];

const ADMIN_NAV = [
  { href: "/dashboard", label: "Dashboard", perm: null },
  { href: "/budgets", label: "Budgets", perm: "budget:read" },
  { href: "/transactions", label: "Transactions", perm: "transaction:read" },
  { href: "/approvals", label: "Approvals", perm: "transaction:approve" },
  { href: "/categories", label: "Categories", perm: "category:read" },
  { href: "/departments", label: "Departments", perm: "department:read" },
  { href: "/projects", label: "Projects", perm: "project:read" },
  { href: "/reports", label: "Reports", perm: "report:read" },
  { href: "/users", label: "Users", perm: "user:read" },
  { href: "/settings", label: "Settings", perm: "settings:read" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return <>{children}</>;
  const isSuper = session.role === "SUPERADMIN";
  const nav = (isSuper ? SUPERADMIN_NAV : ADMIN_NAV).filter(
    (n) => !n.perm || session.permissions.includes(n.perm),
  );
  const unread = await prisma.notification.count({ where: { userId: session.id, isRead: false } }).catch(() => 0);

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-950 text-zinc-200 md:flex">
        <div className="px-5 py-5">
          <p className="text-sm font-bold tracking-tight text-white">BudgetMS</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">{isSuper ? "Platform console" : "Organization console"}</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-800 px-5 py-4 text-xs text-zinc-400">
          <p className="font-medium text-zinc-200">{session.firstName} {session.lastName}</p>
          <p className="truncate">{session.email}</p>
          <p className="mt-1 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold">{session.role}</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-2">
            <MobileNav items={nav} />
            <p className="text-sm font-semibold md:hidden">BudgetMS</p>
          </div>
          <div className="hidden text-xs text-zinc-500 md:block">
            {session.organizationId ? "Organization workspace" : "System workspace"}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/notifications" aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">Sign out</button>
            </form>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
