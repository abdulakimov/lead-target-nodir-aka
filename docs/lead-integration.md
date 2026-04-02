# Lead Integration Flow

## Stored shape

Each lead is saved in PostgreSQL (durable), and cached in Redis with key `lead:{lead_id}`:

```json
{
  "id": "123465",
  "website_data": [],
  "fb_data": []
}
```

Additional sync metadata is stored under `sync` to support retries and idempotency.

## Endpoints

1. `GET /api/meta/webhook`
- Meta webhook verification (`hub.challenge`).

2. `POST /api/meta/webhook`
- Accepts Meta payload (direct lead payload or `entry[].changes[].value`).
- Saves payload into `fb_data`.
- If `website_data` exists for the same `id`, sends merged data to Bitrix.

3. `POST /api/lead/submit`
- Receives website form.
- Reads hidden `lead_id` (from `?lead_id=` query param).
- Saves into `website_data`.
- If `fb_data` exists for the same `id`, sends merged data to Bitrix.
- Also queues/sends Meta Conversions API `Lead` event with dedup `event_id = lead.{lead_id}`.

4. `POST /api/internal/bitrix-retry`
- Internal retry processor for failed Bitrix sync and Meta CAPI outbox events.
- Header: `x-internal-secret: <INTERNAL_SYNC_SECRET>`.

5. `GET /api/internal/lead/{id}`
- Internal lead inspection endpoint.
- Header: `x-internal-secret: <INTERNAL_SYNC_SECRET>`.

## Environment variables

- `REDIS_URL`
- `POSTGRES_URL`
- `META_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_ACCESS_TOKEN` (optional: for ad/adset/campaign name enrichment)
- `META_GRAPH_VERSION` (default `v23.0`)
- `META_PIXEL_ID`
- `META_CAPI_ACCESS_TOKEN`
- `META_TEST_EVENT_CODE` (optional for Events Manager Test Events)
- `BITRIX_WEBHOOK_URL`
- `INTERNAL_SYNC_SECRET`
- `BITRIX_TIMEOUT_MS`

## Retry queue

- Failed syncs are queued in Redis sorted set `lead:bitrix:retry`.
- Score is next retry timestamp in ms.
- Meta CAPI retries are stored durably in PostgreSQL table `meta_capi_events` (`pending/failed/success` with backoff).

## Docker

Run full stack:

```bash
docker compose up -d --build
```

Services:
- `app` on `:3000`
- `postgres` with persistent volume
- `redis` with AOF enabled
