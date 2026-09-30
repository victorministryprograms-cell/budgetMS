import { prisma } from "./db";

type AuditInput = {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function audit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        oldValues:
          input.oldValues === undefined || input.oldValues === null
            ? undefined
            : JSON.stringify(input.oldValues),
        newValues:
          input.newValues === undefined || input.newValues === null
            ? undefined
            : JSON.stringify(input.newValues),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (e) {
    // Audit must never break the main flow
    console.error("audit failed", e);
  }
}
