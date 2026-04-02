import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { upsertFbData } from "../../../lib/server/lead-store";
import type { MetaLeadPayload } from "../../../lib/server/types";

function sanitizeLeadId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET?.trim();
  const allowUnsigned = process.env.META_ALLOW_UNSIGNED_WEBHOOK === "true";
  const isProd = process.env.NODE_ENV === "production";
  if (!appSecret) return !isProd && allowUnsigned;
  if (isProd && allowUnsigned) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;

  try {
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

function collectLeads(payload: unknown): MetaLeadPayload[] {
  if (!payload || typeof payload !== "object") return [];
  const candidate = payload as Record<string, unknown>;

  if (typeof candidate.id === "string" && Array.isArray(candidate.field_data)) {
    return [candidate as unknown as MetaLeadPayload];
  }

  const entries = Array.isArray(candidate.entry) ? candidate.entry : [];
  const leads: MetaLeadPayload[] = [];

  for (const entry of entries) {
    const changes = Array.isArray((entry as Record<string, unknown>).changes) ? ((entry as Record<string, unknown>).changes as Array<Record<string, unknown>>) : [];
    for (const change of changes) {
      if (change.field !== "leadgen") continue;
      const value = change.value;
      if (!value || typeof value !== "object") continue;
      const obj = value as Record<string, unknown>;

      // Already expanded payload (contains lead id + field_data)
      if (typeof obj.id === "string") {
        leads.push(obj as MetaLeadPayload);
        continue;
      }

      // Native leadgen webhook payload uses leadgen_id
      if (typeof obj.leadgen_id === "string") {
        leads.push({
          ...(obj as MetaLeadPayload),
          id: obj.leadgen_id,
        });
      }
    }
  }

  return leads;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expectedToken = process.env.META_VERIFY_TOKEN?.trim();
  if (mode === "subscribe" && expectedToken && verifyToken === expectedToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const leads = collectLeads(json);

  await Promise.all(
    leads.map(async (lead) => {
      if (!lead.id) return;
      const safeId = sanitizeLeadId(lead.id);
      if (!safeId) return;
      await upsertFbData(safeId, lead);
    }),
  );

  return NextResponse.json({ ok: true, accepted: leads.length });
}
