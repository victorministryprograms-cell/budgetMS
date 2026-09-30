import { prisma } from "../db";
import { audit } from "../audit";
import { requirePermission, requireOrganizationAccess, isSuperAdmin, assertSameOrg } from "../permissions";
import { AppError, toResult } from "../errors";
import { MAX_ATTACHMENT_BYTES, ALLOWED_CONTENT_TYPES, isAllowedContentType, sanitizeFilename } from "../attachments-policy";

export { MAX_ATTACHMENT_BYTES, ALLOWED_CONTENT_TYPES };

function assertAllowedType(contentType: string) {
  if (!isAllowedContentType(contentType)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Unsupported file type. Allowed: ${ALLOWED_CONTENT_TYPES.join(", ")}.`,
    );
  }
}

export async function createAttachment(input: {
  filename: string;
  contentType: string;
  data: Uint8Array;
  transactionId?: string | null;
  organizationId?: string | null;
}) {
  return toResult(async () => {
    const s = await requirePermission("transaction:create");
    const { organizationId } = await requireOrganizationAccess(input.organizationId ?? null);
    const orgId = organizationId ?? s.organizationId;
    if (!orgId) throw new AppError("VALIDATION_ERROR", "Organization is required.");

    if (input.data.byteLength === 0) throw new AppError("VALIDATION_ERROR", "File is empty.");
    if (input.data.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new AppError(
        "VALIDATION_ERROR",
        `File is too large. Maximum size is ${Math.floor(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB.`,
      );
    }
    assertAllowedType(input.contentType);

    // A transaction may only be linked within the caller's own organization.
    if (input.transactionId) {
      const t = await prisma.transaction.findUnique({ where: { id: input.transactionId } });
      if (!t) throw new AppError("NOT_FOUND", "Transaction not found.");
      if (t.organizationId !== orgId) throw new AppError("FORBIDDEN", "Cross-organization access denied.");
    }

    const attachment = await prisma.attachment.create({
      data: {
        organizationId: orgId,
        transactionId: input.transactionId || null,
        filename: sanitizeFilename(input.filename),
        contentType: input.contentType,
        sizeBytes: input.data.byteLength,
        content: Buffer.from(input.data),
        uploadedById: s.id,
      },
      select: { id: true, transactionId: true, filename: true, contentType: true, sizeBytes: true, createdAt: true },
    });

    await audit({
      organizationId: orgId,
      userId: s.id,
      action: "ATTACHMENT_UPLOADED",
      entityType: "Attachment",
      entityId: attachment.id,
      newValues: { filename: attachment.filename, sizeBytes: attachment.sizeBytes, transactionId: attachment.transactionId },
    });

    return attachment;
  });
}

export async function listAttachments(transactionId: string) {
  return toResult(async () => {
    await requirePermission("transaction:read");
    const { session, organizationId } = await requireOrganizationAccess();
    const t = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!t) throw new AppError("NOT_FOUND", "Transaction not found.");
    if (!isSuperAdmin(session.role)) assertSameOrg(t.organizationId, organizationId);
    return prisma.attachment.findMany({
      where: { transactionId },
      select: { id: true, transactionId: true, filename: true, contentType: true, sizeBytes: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  });
}

/**
 * Reads the BLOB for download. Callers must have already authorised the request;
 * the organisation check is repeated here so the row can never be served to a
 * caller from another tenant.
 */
export async function getAttachmentContent(id: string) {
  return toResult(async () => {
    await requirePermission("transaction:read");
    const { session, organizationId } = await requireOrganizationAccess();
    const a = await prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new AppError("NOT_FOUND", "Attachment not found.");
    if (!isSuperAdmin(session.role)) assertSameOrg(a.organizationId, organizationId);
    return a;
  });
}

export async function deleteAttachment(id: string) {
  return toResult(async () => {
    const s = await requirePermission("transaction:update");
    const { organizationId } = await requireOrganizationAccess();
    const a = await prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new AppError("NOT_FOUND", "Attachment not found.");
    assertSameOrg(a.organizationId, organizationId);
    // Uploader may remove their own file; otherwise only an ADMIN may.
    const isAdmin = s.role === "ADMIN" || isSuperAdmin(s.role);
    if (a.uploadedById !== s.id && !isAdmin) {
      throw new AppError("FORBIDDEN", "You cannot delete this attachment.");
    }
    await prisma.attachment.delete({ where: { id } });
    await audit({
      organizationId: a.organizationId,
      userId: s.id,
      action: "ATTACHMENT_DELETED",
      entityType: "Attachment",
      entityId: id,
      oldValues: { filename: a.filename },
    });
    return { id };
  });
}
