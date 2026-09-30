import DecimalJS from "decimal.js";
import { prisma } from "../db";
import { audit } from "../audit";
import { notifyOrgUsers } from "../notifications";
import { requirePermission, requireOrganizationAccess, isSuperAdmin, assertSameOrg } from "../permissions";
import { AppError, toResult } from "../errors";
import { transactionSchema } from "../validations";
import { assertTransactionTransition, type TransactionStatus } from "../workflows";

export async function listTransactions(orgId?: string | null, params?: { search?: string; status?: string; type?: string; page?: number; pageSize?: number }) {
  return toResult(async () => {
    await requirePermission("transaction:read");
    const { organizationId, session } = await requireOrganizationAccess(orgId);
    const scopeOrg = organizationId ?? (isSuperAdmin(session.role) ? undefined : session.organizationId!);
    const page = params?.page ?? 1;
    const pageSize = Math.min(params?.pageSize ?? 10, 100);
    const where: Record<string, unknown> = {};
    if (scopeOrg) where.organizationId = scopeOrg;
    if (params?.status) where.status = params.status;
    if (params?.type) where.type = params.type;
    if (params?.search) {
      const or = [
        { description: { contains: params.search } },
        { reference: { contains: params.search } },
        { vendor: { contains: params.search } },
      ];
      where.AND = [
        ...(scopeOrg ? [{ organizationId: scopeOrg }] : []),
        ...(params.status ? [{ status: params.status }] : []),
        ...(params.type ? [{ type: params.type }] : []),
        { OR: or },
      ];
      delete where.organizationId; delete where.status; delete where.type;
    }
    const [total, items] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where, orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize, take: pageSize,
        include: { category: true, department: true, project: true, budget: { select: { id: true, name: true, budgetCode: true } } },
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function getTransaction(id: string) {
  return toResult(async () => {
    await requirePermission("transaction:read");
    const { session, organizationId } = await requireOrganizationAccess();
    const t = await prisma.transaction.findUnique({
      where: { id },
      include: {
        approvals: { include: { user: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
        budget: true, budgetItem: true, category: true, department: true, project: true,
        attachments: {
          select: { id: true, filename: true, contentType: true, sizeBytes: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!t) throw new AppError("NOT_FOUND", "Transaction not found.");
    if (!isSuperAdmin(session.role)) assertSameOrg(t.organizationId, organizationId);
    return t;
  });
}

export async function createTransaction(input: unknown) {
  return toResult(async () => {
    const s = await requirePermission("transaction:create");
    const data = transactionSchema.parse(input);
    const { organizationId } = await requireOrganizationAccess(data.organizationId ?? null);
    const orgId = organizationId ?? s.organizationId;
    if (!orgId) throw new AppError("VALIDATION_ERROR", "Organization is required.");

    if (data.idempotencyKey) {
      const dup = await prisma.transaction.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
      if (dup) throw new AppError("DUPLICATE_TRANSACTION", "Duplicate transaction (idempotency key already used).");
    }
    // Validate budget item belongs to same org if provided
    if (data.budgetItemId) {
      const item = await prisma.budgetItem.findUnique({ where: { id: data.budgetItemId }, include: { budget: true } });
      if (!item) throw new AppError("NOT_FOUND", "Budget item not found.");
      if (item.budget.organizationId !== orgId) throw new AppError("FORBIDDEN", "Cross-organization access denied.");
    }
    if (data.budgetId) {
      const b = await prisma.budget.findUnique({ where: { id: data.budgetId } });
      if (!b) throw new AppError("NOT_FOUND", "Budget not found.");
      if (b.organizationId !== orgId) throw new AppError("FORBIDDEN", "Cross-organization access denied.");
    }

    const t = await prisma.transaction.create({
      data: {
        organizationId: orgId,
        budgetId: data.budgetId || null,
        budgetItemId: data.budgetItemId || null,
        categoryId: data.categoryId || null,
        departmentId: data.departmentId || null,
        projectId: data.projectId || null,
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        reference: data.reference || null,
        transactionDate: data.transactionDate ?? new Date(),
        vendor: data.vendor || null,
        attachmentUrl: data.attachmentUrl || null,
        idempotencyKey: data.idempotencyKey || null,
        status: "DRAFT",
        createdById: s.id,
      },
    });
    await audit({ organizationId: orgId, userId: s.id, action: "TRANSACTION_CREATED", entityType: "Transaction", entityId: t.id, newValues: { amount: t.amount.toString(), type: t.type } });
    return t;
  });
}

async function transitionTransaction(id: string, to: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "DRAFT", comment?: string, perm?: string) {
  return toResult(async () => {
    const s = await requirePermission(perm ?? "transaction:update");
    const { organizationId } = await requireOrganizationAccess();
    const existing = await prisma.transaction.findUnique({ where: { id: id }, include: { budgetItem: true } });
    if (!existing) throw new AppError("NOT_FOUND", "Transaction not found.");
    if (!isSuperAdmin(s.role)) assertSameOrg(existing.organizationId, organizationId);
    if (to === "REJECTED" && !comment) throw new AppError("VALIDATION_ERROR", "Rejection reason is required.");
    try {
      assertTransactionTransition(existing.status as TransactionStatus, to);
    } catch {
      throw new AppError("INVALID_STATUS", `Invalid transaction transition: ${existing.status} → ${to}`);
    }

    // Atomic approval: update budget item spent exactly once
    if (to === "APPROVED") {
      if (existing.status !== "PENDING") throw new AppError("INVALID_STATUS", "Only PENDING transactions can be approved.");
      const result = await prisma.$transaction(async (tx) => {
        // Re-read inside tx to prevent double-apply
        const fresh = await tx.transaction.findUnique({ where: { id } });
        if (!fresh || fresh.status !== "PENDING") throw new AppError("INVALID_STATUS", "Transaction was already processed.");
        const updated = await tx.transaction.update({
          where: { id },
          data: { status: "APPROVED", approvedById: s.id, approvedAt: new Date(), rejectionReason: null },
        });
        // Only EXPENSE increases spend; INCOME/REFUND decrease; ADJUSTMENT increases (signed handling: treat amount sign by type)
        if (existing.budgetItemId) {
          const item = await tx.budgetItem.findUnique({ where: { id: existing.budgetItemId } });
          if (!item) throw new AppError("NOT_FOUND", "Budget item not found.");
          const amt = new DecimalJS(existing.amount.toString());
          const delta = existing.type === "EXPENSE" ? amt
            : existing.type === "INCOME" ? amt.neg()
            : existing.type === "REFUND" ? amt.neg()
            : amt; // ADJUSTMENT
          const newSpent = new DecimalJS(item.spentAmount.toString()).plus(delta);
          await tx.budgetItem.update({
            where: { id: item.id },
            data: { spentAmount: newSpent.toNumber() },
          });
        }
        await tx.transactionApproval.create({
          data: { transactionId: id, userId: s.id, fromStatus: existing.status, toStatus: to, comment: comment ?? null },
        });
        return updated;
      });
      await audit({ organizationId: existing.organizationId, userId: s.id, action: "TRANSACTION_APPROVED", entityType: "Transaction", entityId: id, oldValues: { status: existing.status }, newValues: { status: "APPROVED" } });
      await notifyOrgUsers(existing.organizationId, { title: "Expense approved", message: `Transaction ${existing.reference || id} approved.`, link: `/transactions/${id}`, excludeUserId: s.id });
      return result;
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status: to,
        rejectionReason: to === "REJECTED" ? comment : to === "DRAFT" ? null : existing.rejectionReason,
      },
    });
    await prisma.transactionApproval.create({
      data: { transactionId: id, userId: s.id, fromStatus: existing.status, toStatus: to, comment: comment ?? null },
    });
    const action = to === "PENDING" ? "TRANSACTION_SUBMITTED" : to === "REJECTED" ? "TRANSACTION_REJECTED" : "TRANSACTION_UPDATED";
    await audit({ organizationId: existing.organizationId, userId: s.id, action, entityType: "Transaction", entityId: id, oldValues: { status: existing.status }, newValues: { status: to } });
    return updated;
  });
}

export const submitTransaction = (id: string) => transitionTransaction(id, "PENDING", undefined, "transaction:submit");
export const approveTransaction = (id: string, comment?: string) => transitionTransaction(id, "APPROVED", comment, "transaction:approve");
export const rejectTransaction = (id: string, reason: string) => transitionTransaction(id, "REJECTED", reason, "transaction:reject");
