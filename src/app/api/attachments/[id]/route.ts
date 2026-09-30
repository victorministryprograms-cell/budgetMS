import { NextRequest, NextResponse } from "next/server";
import { deleteAttachment } from "@/lib/services/attachments";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const result = await deleteAttachment(id);
  if (!result.success) {
    const status = result.error.code === "UNAUTHORIZED" ? 401 : result.error.code === "FORBIDDEN" ? 403 : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
