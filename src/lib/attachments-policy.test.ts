import { describe, it, expect } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  isAllowedContentType,
  sanitizeFilename,
  ALLOWED_CONTENT_TYPES,
} from "@/lib/attachments-policy";

describe("attachment size limit", () => {
  it("is 2MB, which base64-encoded stays under Vercel's 4.5MB request cap", () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(2 * 1024 * 1024);
    // base64 expands by 4/3; 2MB -> ~2.67MB, leaving headroom under 4.5MB
    expect(Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3)).toBeLessThan(4.5 * 1024 * 1024);
  });
});

describe("attachment content types", () => {
  it("accepts document and image types", () => {
    for (const t of ["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain"]) {
      expect(isAllowedContentType(t)).toBe(true);
    }
  });

  it("rejects scriptable types that could execute in the app origin", () => {
    for (const t of ["text/html", "image/svg+xml", "application/xhtml+xml", "text/javascript"]) {
      expect(isAllowedContentType(t)).toBe(false);
    }
  });

  it("is not fooled by case or parameters", () => {
    expect(isAllowedContentType("APPLICATION/PDF")).toBe(false);
    expect(isAllowedContentType("application/pdf; charset=utf-8")).toBe(false);
  });

  it("exposes a non-empty allowlist", () => {
    expect(ALLOWED_CONTENT_TYPES.length).toBeGreaterThan(0);
  });
});

describe("filename sanitisation", () => {
  it("strips directory traversal", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("..\\..\\windows\\system32\\config")).toBe("config");
  });

  it("strips quotes that could break a Content-Disposition header", () => {
    expect(sanitizeFilename('evil".pdf')).toBe("evil.pdf");
    expect(sanitizeFilename('a"b\r\nX-Injected: 1.pdf')).not.toContain("\r");
    expect(sanitizeFilename('a"b\r\nX-Injected: 1.pdf')).not.toContain("\n");
  });

  it("strips control characters", () => {
    expect(sanitizeFilename("re\u0000ceipt\u0007.pdf")).toBe("receipt.pdf");
  });

  it("keeps ordinary filenames intact", () => {
    expect(sanitizeFilename("invoice-2026-01.pdf")).toBe("invoice-2026-01.pdf");
    expect(sanitizeFilename("Q1 report (final).csv")).toBe("Q1 report (final).csv");
  });

  it("falls back to a safe default for empty or fully stripped names", () => {
    expect(sanitizeFilename("")).toBe("file");
    expect(sanitizeFilename("   ")).toBe("file");
    expect(sanitizeFilename('"""')).toBe("file");
    expect(sanitizeFilename("../")).toBe("file");
  });

  it("caps absurdly long names", () => {
    expect(sanitizeFilename("a".repeat(500) + ".pdf").length).toBeLessThanOrEqual(180);
  });
});
