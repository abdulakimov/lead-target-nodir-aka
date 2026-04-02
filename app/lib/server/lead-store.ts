import crypto from "node:crypto";
import { getRedis } from "./redis";
import { sendLeadToBitrix } from "./bitrix-adapter";
import { pgGetLead, pgGetLatestLeads, pgUpsertLead } from "./postgres";
import type { LeadRecord, MetaLeadPayload, WebsiteLeadData } from "./types";

const RETRY_ZSET_KEY = "lead:bitrix:retry";
const LEAD_LOCK_TTL_MS = 15_000;

function leadKey(id: string): string {
  return `lead:${id}`;
}

function leadLockKey(id: string): string {
  return `lead:lock:${id}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultRecord(id: string): LeadRecord {
  const now = nowIso();
  return {
    id,
    website_data: [],
    fb_data: [],
    created_at: now,
    updated_at: now,
    sync: {
      status: "idle",
      attempts: 0,
      last_error: null,
      last_synced_at: null,
      last_checksum: null,
      bitrix_lead_id: null,
      next_retry_at: null,
    },
  };
}

async function getRecord(id: string): Promise<LeadRecord> {
  const redis = await getRedis();
  const raw = await redis.get(leadKey(id));
  if (raw) {
    try {
      return JSON.parse(raw) as LeadRecord;
    } catch {
      // fall through to postgres
    }
  }

  const row = await pgGetLead<{ id: string; payload: LeadRecord }>(id);
  const record = row?.payload ?? defaultRecord(id);
  await redis.set(leadKey(id), JSON.stringify(record));
  return record;
}

export async function readLeadRecord(id: string): Promise<LeadRecord> {
  return getRecord(id.trim());
}

async function saveRecord(record: LeadRecord): Promise<void> {
  record.updated_at = nowIso();
  await pgUpsertLead(record.id, record);
  const redis = await getRedis();
  await redis.set(leadKey(record.id), JSON.stringify(record));
}

async function withLeadLock<T>(id: string, work: () => Promise<T>): Promise<T> {
  const redis = await getRedis();
  const lockKey = leadLockKey(id);
  const lockValue = crypto.randomUUID();
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const acquired = await redis.setIfAbsent(lockKey, lockValue, LEAD_LOCK_TTL_MS);
    if (acquired) {
      try {
        return await work();
      } finally {
        await redis.deleteIfValue(lockKey, lockValue);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  throw new Error(`Lead lock timeout for ${id}`);
}

function checksumForSync(record: LeadRecord): string {
  const latestWebsite = record.website_data[record.website_data.length - 1] ?? null;
  const latestFb = record.fb_data[record.fb_data.length - 1] ?? null;
  return crypto.createHash("sha256").update(JSON.stringify({ latestWebsite, latestFb })).digest("hex");
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (!digits) return "";
  return digits.startsWith("998") ? digits : `998${digits}`;
}

function extractFbPhone(payload: MetaLeadPayload): string {
  const item = payload.field_data?.find((field) => field.name === "phone_number");
  const raw = item?.values?.[0] ?? "";
  return typeof raw === "string" ? normalizePhone(raw) : "";
}

function latestWebsitePhone(record: LeadRecord): string {
  const website = record.website_data[record.website_data.length - 1];
  return normalizePhone(website?.phone ?? "");
}

async function findWebsiteLeadMatchForFbPayload(payload: MetaLeadPayload): Promise<string | null> {
  const fbPhone = extractFbPhone(payload);
  if (!fbPhone) return null;

  const recent = await pgGetLatestLeads<{ id: string; payload: LeadRecord }>(200);
  const matches = recent
    .map((row) => row.payload)
    .filter((record) => record.website_data.length > 0)
    .filter((record) => record.fb_data.length === 0)
    .filter((record) => {
      const updatedAt = Date.parse(record.updated_at || "");
      if (!Number.isFinite(updatedAt)) return false;
      return Date.now() - updatedAt <= 2 * 60 * 60 * 1000;
    })
    .filter((record) => latestWebsitePhone(record) === fbPhone);

  if (matches.length !== 1) return null;
  return matches[0]?.id ?? null;
}

async function scheduleRetry(id: string, seconds: number): Promise<void> {
  const redis = await getRedis();
  const ts = Date.now() + seconds * 1000;
  await redis.zAdd(RETRY_ZSET_KEY, [{ score: ts, value: id }]);
}

export async function enqueueLeadSync(id: string, delaySeconds = 0): Promise<void> {
  const cleanId = id.trim();
  if (!cleanId) return;
  await scheduleRetry(cleanId, Math.max(0, delaySeconds));
}

async function trySync(record: LeadRecord): Promise<LeadRecord> {
  if (record.website_data.length === 0) {
    record.sync.status = "pending";
    return record;
  }

  const currentChecksum = checksumForSync(record);
  if (record.sync.status === "success" && record.sync.last_checksum === currentChecksum) {
    return record;
  }

  record.sync.status = "pending";
  const result = await sendLeadToBitrix(record);

  if (result.ok) {
    record.sync.status = "success";
    record.sync.last_error = null;
    record.sync.last_synced_at = nowIso();
    record.sync.last_checksum = currentChecksum;
    record.sync.bitrix_lead_id = result.leadId ?? null;
    record.sync.next_retry_at = null;
    return record;
  }

  record.sync.status = "failed";
  record.sync.last_error = result.error ?? "Bitrix sync failed";
  record.sync.attempts += 1;
  const retryAfter = Math.min(300, 10 * Math.max(1, record.sync.attempts));
  record.sync.next_retry_at = new Date(Date.now() + retryAfter * 1000).toISOString();
  await scheduleRetry(record.id, retryAfter);
  return record;
}

export async function upsertFbData(id: string, payload: MetaLeadPayload, enqueueSync = true): Promise<LeadRecord> {
  const cleanId = id.trim();
  const fallbackLeadId = await findWebsiteLeadMatchForFbPayload(payload);
  const effectiveId = fallbackLeadId || cleanId;
  return withLeadLock(effectiveId, async () => {
    const record = await getRecord(effectiveId);
    record.fb_data.push(payload);
    if (record.fb_data.length > 20) {
      record.fb_data = record.fb_data.slice(-20);
    }
    record.sync.status = "pending";
    await saveRecord(record);
    if (enqueueSync) {
      await enqueueLeadSync(effectiveId, 0);
    }
    return record;
  });
}

export async function upsertWebsiteData(id: string, payload: WebsiteLeadData, enqueueSync = true): Promise<LeadRecord> {
  const cleanId = id.trim();
  return withLeadLock(cleanId, async () => {
    const record = await getRecord(cleanId);
    record.website_data.push(payload);
    if (record.website_data.length > 20) {
      record.website_data = record.website_data.slice(-20);
    }
    record.sync.status = "pending";
    await saveRecord(record);
    if (enqueueSync) {
      await enqueueLeadSync(cleanId, 0);
    }
    return record;
  });
}

export async function processRetryQueue(limit = 30): Promise<{ processed: number }> {
  const redis = await getRedis();
  const now = Date.now();
  const dueIds = await redis.zRangeByScore(RETRY_ZSET_KEY, 0, now, { LIMIT: { offset: 0, count: limit } });
  if (dueIds.length === 0) return { processed: 0 };

  await redis.zRem(RETRY_ZSET_KEY, dueIds);

  for (const id of dueIds) {
    await withLeadLock(id, async () => {
      const record = await getRecord(id);
      const synced = await trySync(record);
      await saveRecord(synced);
    });
  }

  return { processed: dueIds.length };
}
