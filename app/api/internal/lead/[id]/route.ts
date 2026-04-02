import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { readLeadRecord } from "../../../../lib/server/lead-store";

function isAuthorized(request: Request): boolean {
  const secret = process.env.INTERNAL_SYNC_SECRET?.trim();
  if (!secret) return false;
  const provided = request.headers.get("x-internal-secret")?.trim();
  if (!provided) return false;
  const a = Buffer.from(secret, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const record = await readLeadRecord(id);
  if (!record || !record.id) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}
