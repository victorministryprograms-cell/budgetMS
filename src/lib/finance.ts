import { Decimal } from "@prisma/client/runtime/library";
import DecimalJS from "decimal.js";

export function toDecimal(v: string | number | Decimal | DecimalJS): DecimalJS {
  return new DecimalJS(v.toString());
}

export function money(v: string | number | Decimal | DecimalJS): string {
  return toDecimal(v).toFixed(2);
}

/** remaining = allocated - spent (server-side, never trust client totals) */
export function remainingAmount(allocated: string | number | Decimal, spent: string | number | Decimal): DecimalJS {
  return toDecimal(allocated).minus(toDecimal(spent));
}

/** utilization % = spent / allocated * 100 ; 0 when allocated is 0 */
export function utilizationPercentage(
  allocated: string | number | Decimal,
  spent: string | number | Decimal,
): number {
  const a = toDecimal(allocated);
  if (a.isZero()) return 0;
  return toDecimal(spent).div(a).times(100).toNumber();
}

/** variance = actual - budgeted ; variancePct = variance / budgeted * 100 */
export function variance(budgeted: string | number | Decimal, actual: string | number | Decimal) {
  const b = toDecimal(budgeted);
  const a = toDecimal(actual);
  const v = a.minus(b);
  const pct = b.isZero() ? 0 : v.div(b).times(100).toNumber();
  return { variance: v, variancePct: pct };
}

export type BudgetAlertLevel = "OK" | "WARNING" | "CRITICAL" | "OVER_BUDGET";

export function alertLevel(
  utilization: number,
  warningAt = 80,
  criticalAt = 90,
): BudgetAlertLevel {
  if (utilization >= 100) return "OVER_BUDGET";
  if (utilization >= criticalAt) return "CRITICAL";
  if (utilization >= warningAt) return "WARNING";
  return "OK";
}

export function assertPositiveAmount(amount: DecimalJS, field = "amount") {
  if (!amount.isFinite() || amount.isNegative()) {
    throw new Error(`${field} must be a non-negative finite number`);
  }
}