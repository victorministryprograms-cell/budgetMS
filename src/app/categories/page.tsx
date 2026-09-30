import { listCategories, listDepartments, listProjects } from "@/lib/services/master-data";
import { Card, CardHeader, Badge } from "@/components/ui";
import { MasterForms } from "./forms";

export default async function CategoriesPage() {
  return <MasterDataView />;
}

export async function MasterDataView() {
  const cats = await listCategories();
  const depts = await listDepartments();
  const projs = await listProjects();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Master data</h1>
      <MasterForms />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader title={`Categories (${cats.success ? cats.data.length : 0})`} />
          <ul className="max-h-96 divide-y overflow-auto text-sm">{cats.success && cats.data.map((c) => <li key={c.id} className="px-5 py-2">{c.name} <span className="font-mono text-xs text-zinc-400">{c.code}</span> <Badge status={c.status} /></li>)}</ul></Card>
        <Card><CardHeader title={`Departments (${depts.success ? depts.data.length : 0})`} />
          <ul className="max-h-96 divide-y overflow-auto text-sm">{depts.success && depts.data.map((d) => <li key={d.id} className="px-5 py-2">{d.name} <span className="font-mono text-xs text-zinc-400">{d.code}</span></li>)}</ul></Card>
        <Card><CardHeader title={`Projects (${projs.success ? projs.data.length : 0})`} />
          <ul className="max-h-96 divide-y overflow-auto text-sm">{projs.success && projs.data.map((p) => <li key={p.id} className="px-5 py-2">{p.name} <span className="font-mono text-xs text-zinc-400">{p.code}</span></li>)}</ul></Card>
      </div>
    </div>
  );
}
