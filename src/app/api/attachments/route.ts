import { NextRequest, NextResponse } from "next/server";
import { createAttachment, MAX_ATTACHMENT_BYTES } from "@/lib/services/attachments";

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Expected multipart/form-data." } },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "A file is required." } },
      { status: 400 },
    );
  }

  // Reject on the declared size before reading the body into memory.
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `File is too large. Maximum size is ${Math.floor(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB.`,
        },
      },
      { status: 400 },
    );
  }

  const transactionIdRaw = form.get("transactionId");
  const result = await createAttachment({
    filename: file.name || "file",
    contentType: file.type,
    data: new Uint8Array(await file.arrayBuffer()),
    transactionId: typeof transactionIdRaw === "string" && transactionIdRaw ? transactionIdRaw : null,
  });

  if (!result.success) {
    const status = result.error.code === "UNAUTHORIZED" ? 401 : result.error.code === "FORBIDDEN" ? 403 : result.error.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result, { status: 201 });
}
