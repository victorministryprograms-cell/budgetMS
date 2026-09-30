import { describe, it, expect } from "vitest";
import { remainingAmount, utilizationPercentage, variance, alertLevel, money } from "@/lib/finance";
import { canTransitionBudget, canTransitionTransaction } from "@/lib/workflows";
import { toCSV } from "@/lib/services/reports";

describe("financial calculations (server-side, Decimal-based)", () => {
  it("computes remaining as allocated - spent", () => {
    expect(remainingAmount("1000", "250").toString()).toBe("750");
    expect(remainingAmount(0, 0).toString()).toBe("0");
  });

  it("avoids float errors (0.1 + 0.2 problem)", () => {
    // Native float would give 0.30000000000000004; Decimal must give exactly 0.3
    expect(remainingAmount("0.3", "0.1").toString()).toBe("0.2");
    expect(money("10.005")).toBe("10.01");
  });

  it("computes utilization % and handles zero allocation", () => {
    expect(utilizationPercentage("1000", "250")).toBe(25);
    expect(utilizationPercentage("0", "100")).toBe(0);
    expect(utilizationPercentage("1000", "1000")).toBe(100);
  });

  it("computes variance and variance %", () => {
    const v = variance("1000", "1200");
    expect(v.variance.toString()).toBe("200");
    expect(v.variancePct).toBe(20);
  });

  it("maps alert levels to thresholds", () => {
    expect(alertLevel(10)).toBe("OK");
    expect(alertLevel(80)).toBe("WARNING");
    expect(alertLevel(90)).toBe("CRITICAL");
    expect(alertLevel(100)).toBe("OVER_BUDGET");
    expect(alertLevel(150)).toBe("OVER_BUDGET");
  });
});

describe("workflow transitions", () => {
  it("allows valid budget path DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED", () => {
    expect(canTransitionBudget("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransitionBudget("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionBudget("UNDER_REVIEW", "APPROVED")).toBe(true);
  });

  it("rejects invalid budget transitions", () => {
    expect(canTransitionBudget("DRAFT", "APPROVED")).toBe(false);
    expect(canTransitionBudget("APPROVED", "DRAFT")).toBe(false);
    expect(canTransitionBudget("CLOSED", "ACTIVE")).toBe(false);
  });

  it("allows REJECTED→DRAFT rework loop", () => {
    expect(canTransitionBudget("UNDER_REVIEW", "REJECTED")).toBe(true);
    expect(canTransitionBudget("REJECTED", "DRAFT")).toBe(true);
  });

  it("enforces transaction DRAFT→PENDING→APPROVED with no double-approve", () => {
    expect(canTransitionTransaction("DRAFT", "PENDING")).toBe(true);
    expect(canTransitionTransaction("PENDING", "APPROVED")).toBe(true);
    expect(canTransitionTransaction("APPROVED", "APPROVED")).toBe(false);
    expect(canTransitionTransaction("DRAFT", "APPROVED")).toBe(false);
  });
});

describe("CSV export", () => {
  it("serializes rows with escaping", () => {
    const csv = toCSV([{ a: "x", b: "hello, world" }, { a: 'q"q', b: 1 }]);
    expect(csv.split("\n")[0]).toBe("a,b");
    expect(csv).toContain('"hello, world"');
    expect(csv).toContain('"q""q"');
  });

  it("returns empty string for no rows", () => {
    expect(toCSV([])).toBe("");
  });
});
