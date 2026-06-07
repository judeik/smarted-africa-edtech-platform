# Production Environment Variable Matrix

All environment variables required by each service. Mark every cell before deployment begins.

---

## Backend (Render — `smarted-backend`)

| Variable | Required | Default (dev) | Production Value | Source |
|---|---|---|---|---|
| `NODE_ENV` | ✅ | `development` | `production` | Hardcode in render.yaml |
| `PORT` | ✅ | `5000` | `5000` | Hardcode in render.yaml |
| `MONGODB_URI` | ✅ | local mongo | Atlas connection string | MongoDB Atlas dashboard |
| `REDIS_HOST` | ✅ | `localhost` | Upstash endpoint | Upstash dashboard |
| `REDIS_PORT` | ✅ | `6379` | `6379` | Hardcode in render.yaml |
| `REDIS_PASSWORD` | ✅ | — | Upstash token | Upstash dashboard |
| `REDIS_TLS` | ✅ | `false` | `true` | Hardcode in render.yaml |
| `JWT_SECRET` | ✅ | dev fallback¹ | 64-byte hex | Generate locally |
| `REFRESH_SECRET` | ✅ | dev fallback¹ | 64-byte hex (≠ JWT_SECRET) | Generate locally |
| `JWT_ACCESS_EXPIRES` | ✅ | `15m` | `15m` | Hardcode in render.yaml |
| `SMTP_HOST` | ✅ | — | `smtp.gmail.com` | Hardcode in render.yaml |
| `SMTP_PORT` | ✅ | `587` | `587` | Hardcode in render.yaml |
| `SMTP_USER` | ✅ | — | Gmail address | Render secret |
| `SMTP_PASS` | ✅ | — | Gmail App Password | Render secret |
| `EMAIL_FROM` | ✅ | `no-reply@smarted.africa` | `no-reply@smarted.africa` | Hardcode in render.yaml |
| `PAYSTACK_SECRET_KEY` | ✅ | — | `sk_live_…` | Paystack dashboard |
| `PAYSTACK_PUBLIC_KEY` | ✅ | — | `pk_live_…` | Paystack dashboard |
| `FRONTEND_URL` | ✅ | `http://localhost:5173` | `https://<vercel-domain>` | Set after Vercel deploy |
| `CORS_ORIGIN` | ✅ | `http://localhost:5173` | `https://<vercel-domain>` | Same as FRONTEND_URL |
| `CLOUDINARY_CLOUD_NAME` | ⚪ optional | — | Cloudinary cloud name | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | ⚪ optional | — | Cloudinary API key | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | ⚪ optional | — | Cloudinary API secret | Cloudinary dashboard |
| `SENTRY_DSN` | ⚪ optional | — | Sentry project DSN | Sentry dashboard |
| `REFRESH_EXPIRES_SECONDS` | ⚪ optional | `2592000` (30d) | `2592000` | render.yaml if changing |

> ¹ Dev fallbacks are public strings in source code — they must never reach production. Both `JWT_SECRET` and `REFRESH_SECRET` call `required()` which exits the process if unset in production.

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Run twice. First output → JWT_SECRET. Second output → REFRESH_SECRET.
```

---

## AI Service (Render — `smarted-ai`)

| Variable | Required | Default | Production Value | Source |
|---|---|---|---|---|
| `PORT` | ✅ | `8001` | `8001` | Hardcode in render.yaml |
| `OPENAI_API_KEY` | ✅ | — | `sk-…` | OpenAI dashboard |
| `CORS_ORIGINS` | ✅ | `http://localhost:5173,http://localhost:80` | `https://<vercel-domain>` | Set after Vercel deploy |
| `BACKEND_URL` | ✅ | `http://localhost:5000` | `https://smarted-backend.onrender.com` | Set after backend deploys |
| `SESSION_TTL_SECONDS` | ✅ | `1800` | `1800` | Hardcode in render.yaml |
| `MAX_HISTORY_TURNS` | ✅ | `20` | `20` | Hardcode in render.yaml |
| `MONTHLY_TOKEN_CAP` | ✅ | `50000` | `50000` | render.yaml |
| `GUNICORN_WORKERS` | ✅ | `2` | `2` (starter) / `4` (pro) | render.yaml |

---

## Frontend (Vercel — build-time only)

| Variable | Required | Production Value | Notes |
|---|---|---|---|
| `VITE_API_URL` | ✅ | `https://smarted-backend.onrender.com/api/v1` | Baked into JS bundle at build time |
| `VITE_AI_URL` | ✅ | `https://smarted-ai.onrender.com` | Baked into JS bundle at build time |
| `VITE_SENTRY_DSN` | ⚪ optional | Sentry browser DSN | Baked into JS bundle — use browser DSN (not server DSN) |

> **Warning:** VITE_ variables are embedded in the JavaScript bundle — they are public. Never put secret values in VITE_ variables.
> If Render service URLs change, Vercel must be redeployed to pick up new URLs.

---

## Admin Seeding (one-time, via Render Shell)

| Variable | Required | Value |
|---|---|---|
| `ADMIN_EMAIL` | ✅ | Admin's email address |
| `ADMIN_PASSWORD` | ✅ | Strong password (min 8 chars, upper+lower+digit+special) |
| `ADMIN_NAME` | ⚪ | Display name (default: `SmartEd Admin`) |

Run after first deploy:
```bash
# Via Render dashboard → Backend service → Shell tab
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=YourStrongPass1! node scripts/seedAdmin.js
```

---

## Paystack Webhook (manual Paystack dashboard step)

After backend deploys, set in Paystack dashboard → Settings → API Keys & Webhooks:
```
https://smarted-backend.onrender.com/api/v1/payments/webhook
```

---

## Cross-Wiring Order

These variables can only be filled AFTER dependent services deploy:

| Variable | Service | Filled After |
|---|---|---|
| `FRONTEND_URL` | Backend (Render) | Vercel deploys → copy Vercel domain |
| `CORS_ORIGIN` | Backend (Render) | Same as above |
| `CORS_ORIGINS` | AI (Render) | Same as above |
| `BACKEND_URL` | AI (Render) | Backend deploys → copy Render domain |
| `VITE_API_URL` | Frontend (Vercel) | Backend deploys |
| `VITE_AI_URL` | Frontend (Vercel) | AI service deploys |
