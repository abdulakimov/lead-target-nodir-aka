import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { enqueueLeadSync, upsertWebsiteData } from "../../../lib/server/lead-store";
import { enqueueMetaLeadEvent } from "../../../lib/server/meta-capi";
import type { WebsiteLeadData } from "../../../lib/server/types";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeLeadId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

function isInternalLeadId(value: string): boolean {
  return value.startsWith("site_");
}

function sanitizeExternalClickId(value: string): string {
  return value.replace(/[^A-Za-z0-9_:-]/g, "").slice(0, 128);
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
  const requestId = crypto.randomUUID();
  const t0 = performance.now();
  const formData = await request.formData();
  const tAfterParse = performance.now();

  const submittedLeadId = sanitizeLeadId(asString(formData.get("lead_id")));
  const leadId = submittedLeadId && isInternalLeadId(submittedLeadId) ? submittedLeadId : generateLeadId();
  const externalFromLeadField = isInternalLeadId(submittedLeadId) ? "" : submittedLeadId;
  const externalClickId =
    sanitizeExternalClickId(asString(formData.get("external_click_id"))) ||
    sanitizeExternalClickId(externalFromLeadField) ||
    sanitizeExternalClickId(asString(formData.get("id")));
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
  const tAfterValidateInputRead = performance.now();

  if (
    !isSafeText(parentName, 120) ||
    !isSafeText(childAge, 40) ||
    !isSafeText(regionCode, 20) ||
    !isSafeText(regionName, 120) ||
    !isSafeText(preferredBranch, 120) ||
    !phone
  ) {
    const totalMs = performance.now() - t0;
    const parseMs = tAfterParse - t0;
    const validateMs = tAfterValidateInputRead - tAfterParse;
    console.info(
      JSON.stringify({
        msg: "lead_submit",
        request_id: requestId,
        lead_id: leadId,
        status: 400,
        timings_ms: {
          parse: Number(parseMs.toFixed(2)),
          validate: Number(validateMs.toFixed(2)),
          persist: 0,
          enqueue_bitrix: 0,
          enqueue_capi: 0,
          total: Number(totalMs.toFixed(2)),
        },
      }),
    );
    return new Response("Invalid form data", {
      status: 400,
      headers: {
        "Server-Timing": `parse;dur=${parseMs.toFixed(2)}, validate;dur=${validateMs.toFixed(2)}, persist;dur=0, enqueue_bitrix;dur=0, enqueue_capi;dur=0, total;dur=${totalMs.toFixed(2)}`,
        "X-Request-Id": requestId,
      },
    });
  }

  const websiteData: WebsiteLeadData = {
    lead_id: leadId,
    external_click_id: externalClickId || undefined,
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
  const tAfterValidate = performance.now();

  await upsertWebsiteData(leadId, websiteData, false);
  const tAfterPersist = performance.now();
  await enqueueLeadSync(leadId, 0);
  const tAfterBitrixQueue = performance.now();

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const clientIp = forwardedFor.split(",")[0]?.trim() || undefined;
  await enqueueMetaLeadEvent({
    leadId,
    website: websiteData,
    latestFb: null,
    clientIp,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  const tAfterMetaQueue = performance.now();

  const parseMs = tAfterParse - t0;
  const validateMs = tAfterValidate - tAfterParse;
  const persistMs = tAfterPersist - tAfterValidate;
  const enqueueBitrixMs = tAfterBitrixQueue - tAfterPersist;
  const enqueueCapiMs = tAfterMetaQueue - tAfterBitrixQueue;
  const totalMs = tAfterMetaQueue - t0;

  console.info(
    JSON.stringify({
      msg: "lead_submit",
      request_id: requestId,
      lead_id: leadId,
      status: 303,
      timings_ms: {
        parse: Number(parseMs.toFixed(2)),
        validate: Number(validateMs.toFixed(2)),
        persist: Number(persistMs.toFixed(2)),
        enqueue_bitrix: Number(enqueueBitrixMs.toFixed(2)),
        enqueue_capi: Number(enqueueCapiMs.toFixed(2)),
        total: Number(totalMs.toFixed(2)),
      },
    }),
  );

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/rahmat",
      "Server-Timing": `parse;dur=${parseMs.toFixed(2)}, validate;dur=${validateMs.toFixed(2)}, persist;dur=${persistMs.toFixed(2)}, enqueue_bitrix;dur=${enqueueBitrixMs.toFixed(2)}, enqueue_capi;dur=${enqueueCapiMs.toFixed(2)}, total;dur=${totalMs.toFixed(2)}`,
      "X-Request-Id": requestId,
    },
  });
}
