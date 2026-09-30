export type BudgetStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "CLOSED"
  | "CANCELLED";

export type TransactionStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

const BUDGET_TRANSITIONS: Record<BudgetStatus, BudgetStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["CLOSED", "CANCELLED"],
  REJECTED: ["DRAFT"],
  CLOSED: [],
  CANCELLED: [],
};

const TRANSACTION_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: ["DRAFT"],
  CANCELLED: [],
};

export function canTransitionBudget(from: BudgetStatus, to: BudgetStatus): boolean {
  return BUDGET_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionTransaction(from: TransactionStatus, to: TransactionStatus): boolean {
  return TRANSACTION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertBudgetTransition(from: BudgetStatus, to: BudgetStatus) {
  if (!canTransitionBudget(from, to)) {
    throw new Error(`Invalid budget transition: ${from} → ${to}`);
  }
}

export function assertTransactionTransition(from: TransactionStatus, to: TransactionStatus) {
  if (!canTransitionTransaction(from, to)) {
    throw new Error(`Invalid transaction transition: ${from} → ${to}`);
  }
}
