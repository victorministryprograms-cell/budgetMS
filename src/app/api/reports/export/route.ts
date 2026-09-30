import { NextRequest, NextResponse } from "next/server";
import { getBudgetSummaryReport, getExpenseReport, getDepartmentReport, getCategoryReport, getVarianceReport, toCSV } from "@/lib/services/reports";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "budget";
  let rows: Record<string, unknown>[] = [];
  if (type === "budget") {
    const r = await getBudgetSummaryReport({});
    if (!r.success) return NextResponse.json(r, { status: 403 });
    rows = r.data.map((b) => ({ budget: b.name, code: b.budgetCode, allocated: b.allocated, spent: b.spent, remaining: b.remaining, utilization: b.utilization.toFixed(2), status: b.status }));
  } else if (type === "expenses") {
    const r = await getExpenseReport({});
    if (!r.success) return NextResponse.json(r, { status: 403 });
    rows = r.data.map((t) => ({ id: t.id, date: t.transactionDate.toISOString(), type: t.type, amount: t.amount.toString(), status: t.status, description: t.description ?? "", vendor: t.vendor ?? "", reference: t.reference ?? "" }));
  } else if (type === "departments") {
    const r = await getDepartmentReport({});
    if (!r.success) return NextResponse.json(r, { status: 403 });
    rows = r.data;
  } else if (type === "categories") {
    const r = await getCategoryReport({});
    if (!r.success) return NextResponse.json(r, { status: 403 });
    rows = r.data;
  } else {
    const r = await getVarianceReport({});
    if (!r.success) return NextResponse.json(r, { status: 403 });
    rows = r.data.map((d) => ({ ...d, variancePct: d.variancePct.toFixed(2) }));
  }
  return new NextResponse(toCSV(rows), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${type}-report.csv"` },
  });
}
