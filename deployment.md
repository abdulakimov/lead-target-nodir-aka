# Deployment Guide (VPS + Docker Compose)

Ushbu fayl VPS ichida Codex yoki developer tomonidan tez va xatosiz deploy qilish uchun yozilgan.

## 1. Talablar
- Ubuntu 22.04+ (yoki shunga yaqin Linux)
- Docker + Docker Compose plugin o'rnatilgan
- `git` o'rnatilgan
- 5000-port (yoki reverse proxy orqali ichki port) ochiq

## 2. Loyihani olish
```bash
cd /opt
git clone <YOUR_REPO_URL> robbit
cd /opt/robbit
```

## 3. `.env` tayyorlash
`.env` faylni repo ichida yarating (yoki mavjudini yangilang):

```env
ADMIN_LOGIN=admin
ADMIN_PASSWORD_HASH=<SHA256_HEX>

REDIS_URL=redis://localhost:6379
POSTGRES_URL=postgresql://robbit:robbit_password@localhost:5432/robbit

META_VERIFY_TOKEN=<SECRET>
META_APP_SECRET=<SECRET>
META_ALLOW_UNSIGNED_WEBHOOK=false
META_GRAPH_VERSION=v23.0
META_PIXEL_ID=<PIXEL_ID>
META_CAPI_ACCESS_TOKEN=<SECRET>

BITRIX_WEBHOOK_URL=<SECRET_WEBHOOK_URL>
INTERNAL_SYNC_SECRET=<LONG_RANDOM_SECRET>
BITRIX_TIMEOUT_MS=8000

# Ixtiyoriy: texnik UTM custom field mapping
# BITRIX_TECH_UTM_SOURCE_FIELD=UF_CRM_...
# BITRIX_TECH_UTM_MEDIUM_FIELD=UF_CRM_...
# BITRIX_TECH_UTM_CAMPAIGN_FIELD=UF_CRM_...
# BITRIX_TECH_UTM_CONTENT_FIELD=UF_CRM_...
# BITRIX_TECH_UTM_TERM_FIELD=UF_CRM_...
```

`ADMIN_PASSWORD_HASH` olish:
```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD','utf8').digest('hex'))"
```

## 4. Birinchi deploy
```bash
cd /opt/robbit
docker compose up -d --build
docker compose ps
```

Health check:
```bash
curl -sS http://localhost:5000/api/health
```
Kutilgan javob: `{"ok":true}`

## 5. Prod update (yangi commit)
```bash
cd /opt/robbit
git pull
docker compose up -d --build
docker image prune -f
```

## 6. Muhim servislar
- `app` - Next.js app
- `postgres` - persistent DB (`postgres_data` volume)
- `redis` - queue/cache (`redis_data` volume)
- `retry-cron` - har 5 sekundda `/api/internal/bitrix-retry` ni chaqiradi

## 7. Tekshiruv checklist
1. `docker compose ps` da hamma container `Up`.
2. `curl http://localhost:5000/api/health` -> `ok:true`.
3. Meta webhook callback konfiguratsiyasini tekshiring:
   - callback URL: `https://lead.robbitedu.uz/api/meta/webhook`
   - verify token: `META_VERIFY_TOKEN` bilan bir xil
   - app mode: `Live`
   - page `leadgen` subscription: yoqilgan
4. Form submit qilib Bitrixga lead tushishini tekshiring.
5. Lead ichida:
   - `SOURCE_ID=UC_EH91DG`
   - `STATUS_ID=UC_57JEL9`
   - `CONTACT_ID` mavjud
   - `UTM_*` to'ldirilgan

## 8. Nginx (ixtiyoriy, tavsiya)
Reverse proxy qilib `127.0.0.1:5000` ga yo'naltiring.
TLS uchun `certbot` ishlating.

Minimal upstream:
```nginx
location / {
  proxy_pass http://127.0.0.1:5000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 9. Rollback
Eng oddiy yo'l:
```bash
cd /opt/robbit
git log --oneline -n 10
git checkout <PREVIOUS_COMMIT_HASH>
docker compose up -d --build
```

## 10. Xavfsizlik tavsiyalari
- `.env` ni gitga commit qilmang.
- `INTERNAL_SYNC_SECRET` ni kuchli random qiling.
- `META_ALLOW_UNSIGNED_WEBHOOK=false` holatda qoldiring.
- Bitrix webhook URL va Meta tokenlarni faqat serverda saqlang.
