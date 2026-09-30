"use server";

import { revalidatePath } from "next/cache";
import { createOrganization, updateOrganization } from "./services/organizations";
import { createUser, setUserStatus, resetUserPassword } from "./services/users";
import { createBudget, updateBudget, addBudgetItem, submitBudget, reviewBudget, approveBudget, rejectBudget, activateBudget, closeBudget } from "./services/budgets";
import { createTransaction, submitTransaction, approveTransaction, rejectTransaction } from "./services/transactions";
import { createCategory, updateCategory, deleteCategory, createDepartment, updateDepartment, createProject, updateProject } from "./services/master-data";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { audit } from "./audit";

function rev(paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

export async function orgCreate(input: unknown) {
  const r = await createOrganization(input);
  if (r.success) rev(["/organizations"]);
  return r;
}
export async function orgUpdate(id: string, input: unknown) {
  const r = await updateOrganization(id, input);
  if (r.success) rev(["/organizations", `/organizations/${id}`]);
  return r;
}

export async function userCreate(input: unknown) {
  const r = await createUser(input);
  if (r.success) rev(["/users"]);
  return r;
}
export async function userStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
  const r = await setUserStatus(id, status);
  if (r.success) rev(["/users"]);
  return r;
}
export async function userResetPassword(id: string) {
  return resetUserPassword(id);
}

export async function budgetCreate(input: unknown) {
  const r = await createBudget(input);
  if (r.success) rev(["/budgets"]);
  return r;
}
export async function budgetUpdate(id: string, input: unknown) {
  const r = await updateBudget(id, input);
  if (r.success) rev(["/budgets", `/budgets/${id}`]);
  return r;
}
export async function budgetAddItem(input: unknown) {
  const r = await addBudgetItem(input);
  if (r.success) rev(["/budgets"]);
  return r;
}
export async function budgetSubmit(id: string) {
  const r = await submitBudget(id);
  if (r.success) rev(["/budgets", `/budgets/${id}`, "/approvals"]);
  return r;
}
export async function budgetReview(id: string) {
  const r = await reviewBudget(id);
  if (r.success) rev(["/budgets", `/budgets/${id}`, "/approvals"]);
  return r;
}
export async function budgetApprove(id: string, comment?: string) {
  const r = await approveBudget(id, comment);
  if (r.success) rev(["/budgets", `/budgets/${id}`, "/approvals"]);
  return r;
}
export async function budgetReject(id: string, reason: string) {
  const r = await rejectBudget(id, reason);
  if (r.success) rev(["/budgets", `/budgets/${id}`, "/approvals"]);
  return r;
}
export async function budgetActivate(id: string) {
  const r = await activateBudget(id);
  if (r.success) rev(["/budgets", `/budgets/${id}`]);
  return r;
}
export async function budgetClose(id: string) {
  const r = await closeBudget(id);
  if (r.success) rev(["/budgets", `/budgets/${id}`]);
  return r;
}

export async function txCreate(input: unknown) {
  const r = await createTransaction(input);
  if (r.success) rev(["/transactions"]);
  return r;
}
export async function txSubmit(id: string) {
  const r = await submitTransaction(id);
  if (r.success) rev(["/transactions", `/transactions/${id}`, "/approvals"]);
  return r;
}
export async function txApprove(id: string, comment?: string) {
  const r = await approveTransaction(id, comment);
  if (r.success) rev(["/transactions", `/transactions/${id}`, "/approvals", "/dashboard"]);
  return r;
}
export async function txReject(id: string, reason: string) {
  const r = await rejectTransaction(id, reason);
  if (r.success) rev(["/transactions", `/transactions/${id}`, "/approvals"]);
  return r;
}

export async function categoryCreate(input: unknown) {
  const r = await createCategory(input);
  if (r.success) rev(["/categories"]);
  return r;
}
export async function categoryUpdate(id: string, input: unknown) {
  const r = await updateCategory(id, input);
  if (r.success) rev(["/categories"]);
  return r;
}
export async function categoryDelete(id: string) {
  const r = await deleteCategory(id);
  if (r.success) rev(["/categories"]);
  return r;
}
export async function departmentCreate(input: unknown) {
  const r = await createDepartment(input);
  if (r.success) rev(["/departments"]);
  return r;
}
export async function departmentUpdate(id: string, input: unknown) {
  const r = await updateDepartment(id, input);
  if (r.success) rev(["/departments"]);
  return r;
}
export async function projectCreate(input: unknown) {
  const r = await createProject(input);
  if (r.success) rev(["/projects"]);
  return r;
}
export async function projectUpdate(id: string, input: unknown) {
  const r = await updateProject(id, input);
  if (r.success) rev(["/projects"]);
  return r;
}

export async function markNotification(id: string) {
  const { getSession } = await import("./auth");
  const s = await getSession();
  if (!s) return { success: false as const, error: { code: "UNAUTHORIZED" as const, message: "Sign in required." } };
  await prisma.notification.updateMany({ where: { id, userId: s.id }, data: { isRead: true } });
  rev(["/notifications"]);
  return { success: true as const, data: { id } };
}

export async function markAllNotifications() {
  const { getSession } = await import("./auth");
  const s = await getSession();
  if (!s) return { success: false as const, error: { code: "UNAUTHORIZED" as const, message: "Sign in required." } };
  await prisma.notification.updateMany({ where: { userId: s.id, isRead: false }, data: { isRead: true } });
  rev(["/notifications"]);
  return { success: true as const, data: null };
}

export async function saveSettings(entries: { key: string; value: string }[], organizationId?: string | null) {
  const { requireOrganizationAccess } = await import("./permissions");
  const s = await requirePermission("settings:update");
  const { organizationId: scoped } = await requireOrganizationAccess(organizationId ?? null);
  const orgId = scoped ?? s.organizationId;
  if (!orgId) throw new Error("Organization required for settings.");
  for (const e of entries) {
    const existing = await prisma.systemSetting.findFirst({ where: { organizationId: orgId, key: e.key } });
    if (existing) {
      await prisma.systemSetting.update({ where: { id: existing.id }, data: { value: e.value } });
    } else {
      await prisma.systemSetting.create({ data: { organizationId: orgId, key: e.key, value: e.value } });
    }
  }
  await audit({ organizationId: orgId, userId: s.id, action: "SETTINGS_UPDATED", entityType: "SystemSetting", entityId: orgId ?? "global" });
  rev(["/settings"]);
  return { success: true as const, data: null };
}
