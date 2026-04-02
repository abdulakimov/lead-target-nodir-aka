import crypto from "node:crypto";
import { upsertWebsiteData } from "../../../lib/server/lead-store";
import { enqueueMetaLeadEvent } from "../../../lib/server/meta-capi";
import type { WebsiteLeadData } from "../../../lib/server/types";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeLeadId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

function generateLeadId(): string {
  return `site_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function extractUtm(urlValue: string, key: string): string {
  if (!urlValue) return "";
  try {
    const parsed = new URL(urlValue);
    return parsed.searchParams.get(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("998") ? digits.slice(3) : digits;
  if (normalized.length !== 9) return "";
  return `+998 ${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5, 7)}-${normalized.slice(7, 9)}`;
}

function isSafeText(value: string, maxLen: number): boolean {
  return Boolean(value) && value.length <= maxLen;
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const submittedLeadId = sanitizeLeadId(asString(formData.get("lead_id")));
  const leadId = submittedLeadId || generateLeadId();
  const sourceUrlFromForm = asString(formData.get("source_url"));
  const referer = request.headers.get("referer") ?? "";
  const origin = request.headers.get("origin") ?? "";
  const sourceUrl = sourceUrlFromForm || referer || origin;
  const utmSource = asString(formData.get("utm_source")) || extractUtm(sourceUrl, "utm_source");
  const utmMedium = asString(formData.get("utm_medium")) || extractUtm(sourceUrl, "utm_medium");
  const utmCampaign = asString(formData.get("utm_campaign")) || extractUtm(sourceUrl, "utm_campaign");
  const utmContent = asString(formData.get("utm_content")) || extractUtm(sourceUrl, "utm_content");
  const utmTerm = asString(formData.get("utm_term")) || extractUtm(sourceUrl, "utm_term");
  const parentName = asString(formData.get("parent_name"));
  const childAge = asString(formData.get("child_age"));
  const regionCode = asString(formData.get("region_code"));
  const regionName = asString(formData.get("region_name"));
  const preferredBranch = asString(formData.get("preferred_branch"));
  const phone = normalizePhone(asString(formData.get("phone")));

  if (
    !isSafeText(parentName, 120) ||
    !isSafeText(childAge, 40) ||
    !isSafeText(regionCode, 20) ||
    !isSafeText(regionName, 120) ||
    !isSafeText(preferredBranch, 120) ||
    !phone
  ) {
    return new Response("Invalid form data", { status: 400 });
  }

  const websiteData: WebsiteLeadData = {
    lead_id: leadId,
    parent_name: parentName,
    phone,
    child_age: childAge,
    region_code: regionCode,
    region_name: regionName,
    preferred_branch: preferredBranch,
    submitted_at: new Date().toISOString(),
    source_url: sourceUrl || undefined,
    user_agent: request.headers.get("user-agent") ?? undefined,
    fbp: asString(formData.get("fbp")) || undefined,
    fbc: asString(formData.get("fbc")) || undefined,
    fbclid: asString(formData.get("fbclid")) || undefined,
    utm_source: utmSource || undefined,
    utm_medium: utmMedium || undefined,
    utm_campaign: utmCampaign || undefined,
    utm_content: utmContent || undefined,
    utm_term: utmTerm || undefined,
  };

  const record = await upsertWebsiteData(leadId, websiteData);
  const latestFb = record.fb_data[record.fb_data.length - 1] ?? null;

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const clientIp = forwardedFor.split(",")[0]?.trim() || undefined;
  await enqueueMetaLeadEvent({
    leadId,
    website: websiteData,
    latestFb,
    clientIp,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return new Response(null, {
    status: 303,
    headers: { Location: "/submission-success" },
  });
}
