import crypto from "node:crypto";
import type { MetaLeadPayload, WebsiteLeadData } from "./types";
import { pgGetDueMetaCapiEvents, pgInsertMetaCapiEvent, pgMarkMetaCapiEventFailed, pgMarkMetaCapiEventSuccess } from "./postgres";

type MetaCapiUserData = {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
};

type MetaCapiEventPayload = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url?: string;
  user_data: MetaCapiUserData;
  custom_data?: Record<string, unknown>;
};

type MetaCapiEnvelope = {
  data: MetaCapiEventPayload[];
  test_event_code?: string;
};

function asNonEmpty(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhoneUz(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (digits.startsWith("998")) return digits;
  return `998${digits}`;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function splitName(fullName: string): { firstName?: string; lastName?: string } {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function extractField(fb: MetaLeadPayload | null, fieldName: string): string | null {
  const fieldData = Array.isArray(fb?.field_data) ? fb.field_data : [];
  const hit = fieldData.find((item) => item.name === fieldName);
  const firstValue = hit?.values?.[0];
  return typeof firstValue === "string" && firstValue.trim() ? firstValue.trim() : null;
}

function isConfigured(): boolean {
  return Boolean(asNonEmpty(process.env.META_PIXEL_ID) && asNonEmpty(process.env.META_CAPI_ACCESS_TOKEN));
}

function buildEventId(leadId: string): string {
  return `lead.${leadId}`;
}

function extractFbcFromUrl(urlValue?: string): string | null {
  const source = asNonEmpty(urlValue);
  if (!source) return null;
  try {
    const parsed = new URL(source);
    const fbclid = parsed.searchParams.get("fbclid");
    if (!fbclid) return null;
    return `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
  } catch {
    return null;
  }
}

function buildEnvelope(params: {
  leadId: string;
  website: WebsiteLeadData;
  latestFb: MetaLeadPayload | null;
  clientIp?: string;
  userAgent?: string;
}): MetaCapiEnvelope {
  const { leadId, website, latestFb, clientIp, userAgent } = params;
  const email = extractField(latestFb, "email");
  const fullName = extractField(latestFb, "full_name") ?? website.parent_name;
  const { firstName, lastName } = splitName(fullName);
  const phone = website.phone || extractField(latestFb, "phone_number") || "";
  const eventId = buildEventId(leadId);

  const userData: MetaCapiUserData = {
    external_id: [sha256(leadId)],
  };

  if (email) userData.em = [sha256(normalizeEmail(email))];
  if (phone) userData.ph = [sha256(normalizePhoneUz(phone))];
  if (firstName) userData.fn = [sha256(firstName.toLowerCase())];
  if (lastName) userData.ln = [sha256(lastName.toLowerCase())];
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  const fbp = asNonEmpty(website.fbp);
  const fbc = asNonEmpty(website.fbc) ?? extractFbcFromUrl(website.source_url);
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const event: MetaCapiEventPayload = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: asNonEmpty(website.source_url) ?? undefined,
    user_data: userData,
    custom_data: {
      lead_id: leadId,
      parent_name: website.parent_name,
      child_age: website.child_age,
      region_name: website.region_name,
      preferred_branch: website.preferred_branch,
    },
  };

  const envelope: MetaCapiEnvelope = { data: [event] };
  const testEventCode = asNonEmpty(process.env.META_TEST_EVENT_CODE);
  if (testEventCode) envelope.test_event_code = testEventCode;
  return envelope;
}

async function sendEnvelope(envelope: MetaCapiEnvelope): Promise<{ ok: boolean; error?: string }> {
  const pixelId = asNonEmpty(process.env.META_PIXEL_ID);
  const token = asNonEmpty(process.env.META_CAPI_ACCESS_TOKEN);
  const graphVersion = asNonEmpty(process.env.META_GRAPH_VERSION) ?? "v23.0";
  if (!pixelId || !token) return { ok: false, error: "Meta CAPI config missing" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${pixelId}/events`);
    url.searchParams.set("access_token", token);

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
      signal: controller.signal,
      cache: "no-store",
    });

    const json = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    if (!response.ok || json.error) {
      return { ok: false, error: json.error?.message ?? `Meta CAPI HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Meta CAPI request failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function enqueueMetaLeadEvent(params: {
  leadId: string;
  website: WebsiteLeadData;
  latestFb: MetaLeadPayload | null;
  clientIp?: string;
  userAgent?: string;
}): Promise<{ queued: boolean; sent: boolean }> {
  if (!isConfigured()) return { queued: false, sent: false };

  const envelope = buildEnvelope(params);
  const eventId = envelope.data[0]?.event_id;
  if (!eventId) return { queued: false, sent: false };

  await pgInsertMetaCapiEvent(eventId, envelope);
  return { queued: true, sent: false };
}

export async function processMetaCapiRetryQueue(limit = 50): Promise<{ processed: number; success: number; failed: number }> {
  if (!isConfigured()) return { processed: 0, success: 0, failed: 0 };

  const rows = await pgGetDueMetaCapiEvents(limit);
  let success = 0;
  let failed = 0;

  for (const row of rows) {
    const envelope = row.payload as MetaCapiEnvelope;
    const sendResult = await sendEnvelope(envelope);
    if (sendResult.ok) {
      await pgMarkMetaCapiEventSuccess(row.event_id);
      success += 1;
      continue;
    }

    const nextAttempts = Math.max(1, row.attempts + 1);
    const retryAfter = Math.min(300, 10 * nextAttempts);
    await pgMarkMetaCapiEventFailed(row.event_id, nextAttempts, sendResult.error ?? "Meta CAPI send failed", retryAfter);
    failed += 1;
  }

  return { processed: rows.length, success, failed };
}
