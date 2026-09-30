/**
 * Attachment policy: size limits, accepted content types, and filename
 * sanitisation. Kept free of database imports so it can be unit tested
 * directly.
 */

/**
 * Turso stores file bytes inline as a BLOB, so every upload travels through the
 * serverless function request. Vercel rejects request bodies over 4.5MB and
 * base64 encoding inflates the payload by ~33%, which puts the practical
 * ceiling for a single file at roughly 3MB. 2MB leaves comfortable headroom.
 */
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

/**
 * Only these types are accepted. Serving an unvalidated content type back from
 * the same origin would let an attacker upload HTML or SVG and have it execute
 * as a document, so anything scriptable is rejected.
 */
export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/csv",
  "text/plain",
] as const;

export function isAllowedContentType(contentType: string): boolean {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType);
}

/**
 * Strip anything that could break out of a Content-Disposition header, escape a
 * download path, or confuse a filesystem: directory components, quotes,
 * backslashes, and control characters.
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/["\\]/g, "")
    .trim();
  return cleaned.slice(0, 180) || "file";
}
