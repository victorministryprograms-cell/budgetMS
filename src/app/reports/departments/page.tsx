import { getDepartmentReport } from "@/lib/services/reports";
import { Card } from "@/components/ui";

export default async function DeptReportPage() {
  const r = await getDepartmentReport({});
  if (!r.success) return <p>{r.error.message}</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Department report</h1><a href="/api/reports/export?type=departments" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Export CSV</a></div>
      <Card><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-zinc-500"><th className="px-5 py-3">Department</th><th className="px-3 py-3">Allocated</th><th className="px-3 py-3">Spent</th><th className="px-3 py-3">Remaining</th><th className="px-3 py-3">Util.</th></tr></thead>
      <tbody className="divide-y">{r.data.map((d) => <tr key={d.departmentId}><td className="px-5 py-2.5 font-medium">{d.name}</td><td className="px-3 py-2.5">{d.allocated}</td><td className="px-3 py-2.5">{d.spent}</td><td className="px-3 py-2.5">{d.remaining}</td><td className="px-3 py-2.5">{d.utilization.toFixed(1)}%</td></tr>)}</tbody></table></div></Card>
    </div>
  );
}
