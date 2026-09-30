import Link from "next/link";
import { Card, CardHeader } from "@/components/ui";

const REPORTS = [
  { href: "/reports/budget", title: "Budget summary", desc: "Allocated, spent, remaining, utilization per budget." },
  { href: "/reports/expenses", title: "Expense report", desc: "Filterable transaction listing with CSV export." },
  { href: "/reports/departments", title: "Department report", desc: "Allocated vs spent per department." },
  { href: "/reports/categories", title: "Category report", desc: "Allocated vs spent per category." },
  { href: "/reports/variance", title: "Budget variance", desc: "Budgeted vs actual with variance %." },
];

export default function ReportsIndex() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="p-5 hover:shadow">
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{r.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Card><CardHeader title="Exports" subtitle="Each report page offers CSV export for MVP; PDF/Excel can plug into the same report service layer." /></Card>
    </div>
  );
}
