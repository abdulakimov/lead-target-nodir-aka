# Production Readiness Checklist

## Required environment variables
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD_HASH` (SHA-256 hex)
- `BITRIX_WEBHOOK_URL`
- `INTERNAL_SYNC_SECRET`
- `POSTGRES_URL`
- `REDIS_URL`
- `META_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_PIXEL_ID` (if CAPI enabled)
- `META_CAPI_ACCESS_TOKEN` (if CAPI enabled)
- `BITRIX_TECH_UTM_SOURCE_FIELD` (optional, e.g. `UF_CRM_*`)
- `BITRIX_TECH_UTM_MEDIUM_FIELD` (optional)
- `BITRIX_TECH_UTM_CAMPAIGN_FIELD` (optional)
- `BITRIX_TECH_UTM_CONTENT_FIELD` (optional)
- `BITRIX_TECH_UTM_TERM_FIELD` (optional)

## Security
- Keep `META_ALLOW_UNSIGNED_WEBHOOK=false` in production.
- Rotate `BITRIX_WEBHOOK_URL` and `INTERNAL_SYNC_SECRET` if leaked.
- Expose only:
  - `GET /api/health`
  - `POST /api/meta/webhook`
  - `POST /api/lead/submit`
- Protect internal endpoints with network policy:
  - `POST /api/internal/bitrix-retry`
  - `GET /api/internal/lead/[id]`

## Reliability
- Lead writes are lock-protected in Redis to reduce race conditions.
- Bitrix sync is retryable through `POST /api/internal/bitrix-retry`.
- Docker compose includes `retry-cron` service (5-second loop) that calls retry endpoint.
- If you deploy without docker compose, set external cron (every 5-10 seconds):
  - Header: `x-internal-secret: <INTERNAL_SYNC_SECRET>`

## Deployment verification
1. `docker compose up -d --build`
2. Check health: `GET /api/health` -> `{"ok":true}`
3. Submit test lead with UTM and phone.
4. Verify in Bitrix:
  - Lead created in stage `UC_57JEL9`
  - Source `UC_EH91DG`
  - `UTM_*` fields populated
  - `CONTACT_ID` populated
5. Verify internal record:
  - `sync.status=success`
  - `bitrix_lead_id` filled
