import type { BitrixSyncResult, LeadRecord } from "./types";

function getWebhookBaseUrl(): string {
  const value = process.env.BITRIX_WEBHOOK_URL?.trim();
  if (!value) {
    throw new Error("BITRIX_WEBHOOK_URL is not set");
  }
  return value.endsWith("/") ? value : `${value}/`;
}

function fbField(record: LeadRecord, name: string): string {
  const latestFb = record.fb_data[record.fb_data.length - 1];
  const item = latestFb?.field_data?.find((field) => field.name === name);
  return item?.values?.[0]?.trim() ?? "";
}

function fbTopField(record: LeadRecord, name: string): string {
  const latestFb = record.fb_data[record.fb_data.length - 1] as Record<string, unknown> | undefined;
  if (!latestFb) return "";
  const value = latestFb[name];
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("998")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function buildBitrixFields(record: LeadRecord) {
  const website = record.website_data[record.website_data.length - 1];
  const fullName = website?.parent_name || fbField(record, "full_name") || "Lead";
  const phone = normalizePhone(website?.phone || fbField(record, "phone_number"));
  const regionName = website?.region_name?.trim() ?? "";
  const preferredBranch = website?.preferred_branch?.trim() ?? "";

  const commentsParts = [preferredBranch, regionName].filter(Boolean);
  const titleParts = [phone, regionName].filter(Boolean);
  const adId = fbTopField(record, "ad_id");
  const adGroupId = fbTopField(record, "adgroup_id");
  const campaignId = fbTopField(record, "campaign_id") || fbTopField(record, "compaign_id");
  const formId = fbTopField(record, "form_id");
  const platform = fbTopField(record, "platform") || fbTopField(record, "plaform");
  const utmSource = website?.utm_source ?? "";
  const utmMedium = website?.utm_medium ?? "";
  const utmCampaign = website?.utm_campaign ?? "";
  const utmContent = website?.utm_content ?? "";
  const utmTerm = website?.utm_term ?? "";

  const putCustom = (target: Record<string, unknown>, envKey: string, value: string) => {
    const fieldCode = process.env[envKey]?.trim();
    if (!fieldCode || !value) return;
    target[fieldCode] = value;
  };

  const fields: Record<string, unknown> = {
    TITLE: titleParts.join(" | ") || `Robbit Lead #${record.id}`,
    NAME: fullName,
    PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: "WORK" }] : [],
    SOURCE_ID: "UC_EH91DG",
    STATUS_ID: "UC_57JEL9",
    COMMENTS: commentsParts.join(" | "),
    UTM_SOURCE: utmSource,
    UTM_MEDIUM: utmMedium,
    UTM_CAMPAIGN: utmCampaign,
    UTM_CONTENT: utmContent,
    UTM_TERM: utmTerm,
    UF_CRM_1765477720905: website?.child_age ?? "",
    UF_CRM_1760698508: website?.lead_id ?? record.id,
    UF_CRM_1760698528: adId,
    UF_CRM_1760698600: adGroupId,
    UF_CRM_1760698586: campaignId,
    UF_CRM_1760698377: formId,
    UF_CRM_1760698636: platform,
  };

  // Optional: mirror UTM values into custom fields (e.g. "Texnik maydonlar" section)
  putCustom(fields, "BITRIX_TECH_UTM_SOURCE_FIELD", utmSource);
  putCustom(fields, "BITRIX_TECH_UTM_MEDIUM_FIELD", utmMedium);
  putCustom(fields, "BITRIX_TECH_UTM_CAMPAIGN_FIELD", utmCampaign);
  putCustom(fields, "BITRIX_TECH_UTM_CONTENT_FIELD", utmContent);
  putCustom(fields, "BITRIX_TECH_UTM_TERM_FIELD", utmTerm);

  return fields;
}

function firstNonEmptyId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

async function findContactIdByPhone(phone: string, timeoutMs: number): Promise<string | null> {
  const duplicate = await bitrixCall<{ result?: { CONTACT?: Array<string | number> } }>(
    "crm.duplicate.findbycomm",
    {
      entity_type: "CONTACT",
      type: "PHONE",
      values: [phone],
    },
    timeoutMs,
  );
  if (!duplicate.ok) return null;
  const fromDuplicate = duplicate.data.result?.CONTACT?.[0];
  const duplicateId = firstNonEmptyId(fromDuplicate);
  if (duplicateId) return duplicateId;

  const list = await bitrixCall<{ result?: Array<{ ID?: string | number }> }>(
    "crm.contact.list",
    {
      filter: { PHONE: phone },
      select: ["ID"],
      order: { ID: "DESC" },
      start: 0,
    },
    timeoutMs,
  );
  if (!list.ok) return null;
  return firstNonEmptyId(list.data.result?.[0]?.ID);
}

async function upsertBitrixContact(params: {
  fullName: string;
  phone: string;
  timeoutMs: number;
}): Promise<{ ok: true; contactId: string } | { ok: false; error: string }> {
  const { fullName, phone, timeoutMs } = params;
  const existingId = await findContactIdByPhone(phone, timeoutMs);

  if (existingId) {
    const update = await bitrixCall<{ result?: boolean }>(
      "crm.contact.update",
      {
        id: existingId,
        fields: {
          NAME: fullName || "Lead Contact",
          PHONE: [{ VALUE: phone, VALUE_TYPE: "WORK" }],
        },
      },
      timeoutMs,
    );
    if (!update.ok) return { ok: false, error: update.error };
    return { ok: true, contactId: existingId };
  }

  const add = await bitrixCall<{ result?: number | string }>(
    "crm.contact.add",
    {
      fields: {
        NAME: fullName || "Lead Contact",
        SOURCE_ID: "UC_EH91DG",
        TYPE_ID: "CLIENT",
        OPENED: "Y",
        PHONE: [{ VALUE: phone, VALUE_TYPE: "WORK" }],
      },
    },
    timeoutMs,
  );
  if (!add.ok) return { ok: false, error: add.error };
  return { ok: true, contactId: String(add.data.result ?? "") };
}

type BitrixErrorPayload = {
  error_description?: string;
  error?: string;
};

async function bitrixCall<T>(method: string, body: object, timeoutMs: number): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getWebhookBaseUrl()}${method}.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as T & BitrixErrorPayload;
    if (!response.ok || data.error) {
      return { ok: false, error: data.error_description || data.error || `Bitrix HTTP ${response.status}` };
    }
    return { ok: true, data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Bitrix request timeout" };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Unknown Bitrix error" };
  } finally {
    clearTimeout(timer);
  }
}

async function findExistingLeadIdByWebsiteLeadId(websiteLeadId: string, timeoutMs: number): Promise<string | null> {
  const res = await bitrixCall<{ result?: Array<{ ID?: string | number }> }>(
    "crm.lead.list",
    {
      filter: { UF_CRM_1760698508: websiteLeadId },
      select: ["ID"],
      order: { ID: "DESC" },
      start: 0,
    },
    timeoutMs,
  );
  if (!res.ok) return null;
  const id = res.data.result?.[0]?.ID;
  return id ? String(id) : null;
}

export async function sendLeadToBitrix(record: LeadRecord): Promise<BitrixSyncResult> {
  try {
    const fields = buildBitrixFields(record) as Record<string, unknown>;
    const timeoutMs = Number(process.env.BITRIX_TIMEOUT_MS || "8000");
    const phoneEntry = Array.isArray(fields.PHONE) ? (fields.PHONE[0] as { VALUE?: string } | undefined) : undefined;
    const phone = phoneEntry?.VALUE?.trim() ?? "";
    const fullName = typeof fields.NAME === "string" ? fields.NAME : "";

    if (phone) {
      const contactSync = await upsertBitrixContact({ fullName, phone, timeoutMs });
      if (!contactSync.ok) {
        return { ok: false, error: `Contact sync failed: ${contactSync.error}` };
      }
      fields.CONTACT_ID = contactSync.contactId;
    }

    const websiteLeadId = fields.UF_CRM_1760698508;
    const existingLeadId = websiteLeadId ? await findExistingLeadIdByWebsiteLeadId(String(websiteLeadId), timeoutMs) : null;

    if (existingLeadId) {
      const updateRes = await bitrixCall<{ result?: boolean }>(
        "crm.lead.update",
        {
          id: existingLeadId,
          fields,
        },
        timeoutMs,
      );
      if (!updateRes.ok) {
        return { ok: false, error: updateRes.error };
      }
      return { ok: true, leadId: existingLeadId };
    }

    const addRes = await bitrixCall<{ result?: number | string }>("crm.lead.add", { fields }, timeoutMs);
    if (!addRes.ok) {
      return { ok: false, error: addRes.error };
    }
    return { ok: true, leadId: String(addRes.data.result ?? "") };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown Bitrix error" };
  }
}
