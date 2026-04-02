import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __robbitPgPool: Pool | undefined;
}

function getPostgresUrl(): string {
  const value = process.env.POSTGRES_URL?.trim();
  if (!value) {
    throw new Error("POSTGRES_URL is not set");
  }
  return value;
}

function getPool(): Pool {
  if (!global.__robbitPgPool) {
    global.__robbitPgPool = new Pool({
      connectionString: getPostgresUrl(),
      max: 12,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return global.__robbitPgPool;
}

let schemaReady = false;

export type MetaCapiEventRow = {
  event_id: string;
  payload: unknown;
  status: "pending" | "success" | "failed";
  attempts: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function ensurePostgresSchema(): Promise<void> {
  if (schemaReady) return;

  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads (updated_at DESC);
  `);
  await pool.query(`
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS latest_phone TEXT NULL;
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_leads_latest_phone ON leads (latest_phone);
  `);
  await pool.query(`
    UPDATE leads
    SET latest_phone = CASE
      WHEN regexp_replace(COALESCE(payload#>>'{website_data,-1,phone}', ''), '\D', '', 'g') = '' THEN NULL
      WHEN regexp_replace(COALESCE(payload#>>'{website_data,-1,phone}', ''), '\D', '', 'g') LIKE '998%' THEN regexp_replace(COALESCE(payload#>>'{website_data,-1,phone}', ''), '\D', '', 'g')
      ELSE '998' || regexp_replace(COALESCE(payload#>>'{website_data,-1,phone}', ''), '\D', '', 'g')
    END
    WHERE latest_phone IS NULL;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meta_capi_events (
      event_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT NULL,
      next_retry_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_meta_capi_events_status_retry ON meta_capi_events (status, next_retry_at);
  `);

  schemaReady = true;
}

export async function pgGetLead<T extends QueryResultRow = QueryResultRow>(id: string): Promise<T | null> {
  await ensurePostgresSchema();
  const pool = getPool();
  const result = await pool.query<T>("SELECT id, payload, updated_at FROM leads WHERE id = $1 LIMIT 1", [id]);
  return result.rows[0] ?? null;
}

export async function pgUpsertLead(id: string, payload: unknown, latestPhone: string | null = null): Promise<void> {
  await ensurePostgresSchema();
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO leads (id, payload, updated_at, latest_phone)
      VALUES ($1, $2::jsonb, NOW(), $3)
      ON CONFLICT (id)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW(), latest_phone = EXCLUDED.latest_phone
    `,
    [id, JSON.stringify(payload), latestPhone],
  );
}

export async function pgFindLeadIdByPhone(phone: string): Promise<string | null> {
  await ensurePostgresSchema();
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    "SELECT id FROM leads WHERE latest_phone = $1 ORDER BY updated_at DESC LIMIT 1",
    [phone],
  );
  return result.rows[0]?.id ?? null;
}

export async function pgGetLatestLeads<T extends QueryResultRow = QueryResultRow>(limit = 10): Promise<T[]> {
  await ensurePostgresSchema();
  const pool = getPool();
  const result = await pool.query<T>("SELECT id, payload, updated_at FROM leads ORDER BY updated_at DESC LIMIT $1", [limit]);
  return result.rows;
}

export async function pgInsertMetaCapiEvent(eventId: string, payload: unknown): Promise<void> {
  await ensurePostgresSchema();
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO meta_capi_events (event_id, payload, status, attempts, last_error, next_retry_at, updated_at)
      VALUES ($1, $2::jsonb, 'pending', 0, NULL, NOW(), NOW())
      ON CONFLICT (event_id)
      DO NOTHING
    `,
    [eventId, JSON.stringify(payload)],
  );
}

export async function pgGetDueMetaCapiEvents(limit = 50): Promise<MetaCapiEventRow[]> {
  await ensurePostgresSchema();
  const pool = getPool();
  const result = await pool.query<MetaCapiEventRow>(
    `
      SELECT event_id, payload, status, attempts, last_error, next_retry_at, created_at, updated_at
      FROM meta_capi_events
      WHERE status IN ('pending', 'failed')
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY created_at ASC
      LIMIT $1
    `,
    [limit],
  );
  return result.rows;
}

export async function pgMarkMetaCapiEventSuccess(eventId: string): Promise<void> {
  await ensurePostgresSchema();
  const pool = getPool();
  await pool.query(
    `
      UPDATE meta_capi_events
      SET status = 'success', last_error = NULL, next_retry_at = NULL, updated_at = NOW()
      WHERE event_id = $1
    `,
    [eventId],
  );
}

export async function pgMarkMetaCapiEventFailed(eventId: string, attempts: number, errorMessage: string, retryAfterSeconds: number): Promise<void> {
  await ensurePostgresSchema();
  const pool = getPool();
  await pool.query(
    `
      UPDATE meta_capi_events
      SET status = 'failed',
          attempts = $2,
          last_error = $3,
          next_retry_at = NOW() + make_interval(secs => $4),
          updated_at = NOW()
      WHERE event_id = $1
    `,
    [eventId, attempts, errorMessage.slice(0, 1000), retryAfterSeconds],
  );
}
