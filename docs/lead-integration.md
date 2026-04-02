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
- Enqueues lead for background sync to Bitrix.

3. `POST /api/lead/submit`
- Receives website form.
- Reads hidden `lead_id` (from `?lead_id=` query param).
- Saves into `website_data`.
- Enqueues lead for background sync to Bitrix.
- Queues Meta Conversions API `Lead` event with dedup `event_id = lead.{lead_id}`.
- Browser side Meta Pixel `Lead` is also sent with the same `eventID` for CAPI dedup.
- Returns fast redirect to `/rahmat` (do not wait for Bitrix/CAPI network roundtrip).

## Pixel + CAPI dedupe

- Pixel: global `PageView` on all pages (if `META_PIXEL_ID` is set).
- Browser conversion event: `fbq('track', 'Lead', {}, { eventID: 'lead.<lead_id>' })` on form submit.
- Server conversion event (CAPI): same event name `Lead` and same `event_id` format `lead.<lead_id>`.
- This allows Meta to deduplicate browser/server duplicates and keep conversion counts accurate.

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
- `retry-cron` worker triggers processing every 5 seconds for near-real-time eventual delivery.

## Public pages

- Form page: `/forma`
- Thank-you page: `/rahmat`

## Docker

Run full stack:

```bash
docker compose up -d --build
```

Services:
- `app` on `${HOST_PORT:-5000}` (container listens on `5000`)
- `postgres` with persistent volume
- `redis` with AOF enabled
