import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { processRetryQueue } from "../../../lib/server/lead-store";
import { processMetaCapiRetryQueue } from "../../../lib/server/meta-capi";

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

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const [bitrix, metaCapi] = await Promise.all([processRetryQueue(50), processMetaCapiRetryQueue(50)]);
  return NextResponse.json({ ok: true, bitrix, metaCapi });
}
