import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const organizationSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(24).regex(/^[A-Z0-9-_]+$/i, "Code must be alphanumeric with dashes/underscores."),
  description: z.string().max(500).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
  currency: z.string().min(3).max(3).default("USD"),
  timezone: z.string().max(80).default("UTC"),
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]).default("ACTIVE"),
});

export const userSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  password: z.string().min(8).optional(),
  roleId: z.string().min(1),
  organizationId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

export const budgetSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(2).max(160),
  description: z.string().max(1000).optional().or(z.literal("")),
  budgetCode: z.string().min(2).max(32),
  periodType: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"]).default("YEARLY"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  currency: z.string().min(3).max(3).default("USD"),
  totalAmount: z.coerce.number().nonnegative(),
}).refine((v) => v.endDate >= v.startDate, { message: "End date must be after start date.", path: ["endDate"] });

export const budgetItemSchema = z.object({
  budgetId: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  allocatedAmount: z.coerce.number().nonnegative(),
});

export const transactionSchema = z.object({
  organizationId: z.string().optional(),
  budgetId: z.string().nullable().optional(),
  budgetItemId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  type: z.enum(["EXPENSE", "INCOME", "ADJUSTMENT", "REFUND"]),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  description: z.string().max(1000).optional().or(z.literal("")),
  reference: z.string().max(120).optional().or(z.literal("")),
  transactionDate: z.coerce.date().optional(),
  vendor: z.string().max(160).optional().or(z.literal("")),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
  idempotencyKey: z.string().max(120).optional().or(z.literal("")),
});

export const categorySchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(32),
  description: z.string().max(500).optional().or(z.literal("")),
  parentId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const departmentSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(32),
  description: z.string().max(500).optional().or(z.literal("")),
  managerId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const projectSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(32),
  description: z.string().max(500).optional().or(z.literal("")),
  budgetOwnerId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(120).optional().default(""),
  sort: z.string().max(40).optional(),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});
