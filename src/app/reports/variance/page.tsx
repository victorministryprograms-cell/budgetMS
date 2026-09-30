import { getVarianceReport } from "@/lib/services/reports";
import { Card } from "@/components/ui";

export default async function VariancePage() {
  const r = await getVarianceReport({});
  if (!r.success) return <p>{r.error.message}</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Budget variance</h1><a href="/api/reports/export?type=variance" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Export CSV</a></div>
      <Card><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-zinc-500"><th className="px-5 py-3">Budget</th><th className="px-3 py-3">Budgeted</th><th className="px-3 py-3">Actual</th><th className="px-3 py-3">Variance</th><th className="px-3 py-3">Var %</th></tr></thead>
      <tbody className="divide-y">{r.data.map((d) => <tr key={d.budgetId}><td className="px-5 py-2.5 font-medium">{d.name}</td><td className="px-3 py-2.5">{d.budgeted}</td><td className="px-3 py-2.5">{d.actual}</td><td className="px-3 py-2.5">{d.variance}</td><td className="px-3 py-2.5">{d.variancePct.toFixed(1)}%</td></tr>)}</tbody></table></div></Card>
    </div>
  );
}
