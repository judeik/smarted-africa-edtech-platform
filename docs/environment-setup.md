# Environment Setup Guide

SmartEd Africa uses three deployment tiers with different env var requirements. Every variable in this file maps directly to `backend/src/config/env.js`.

---

## Quick Reference by Tier

| Variable | Local Dev | Staging | Production | Service |
|---|---|---|---|---|
| `MONGODB_URI` | ❌ (local mongo) | ✅ | ✅ | MongoDB Atlas |
| `MONGO_URI` | ✅ | ✅ (alias) | ✅ (alias) | Any MongoDB |
| `REDIS_HOST` | `localhost` | Upstash host | Upstash host | Upstash |
| `REDIS_PORT` | `6379` | `6379` | `6379` | Upstash |
| `REDIS_PASSWORD` | ❌ | ✅ | ✅ | Upstash token |
| `REDIS_TLS` | `false` | `true` | `true` | Upstash requires TLS |
| `JWT_SECRET` | any string | ✅ strong | ✅ 64-byte hex | — |
| `REFRESH_SECRET` | any string | ✅ strong | ✅ 64-byte hex | — |
| `SMTP_HOST` | ❌ (mocked) | ✅ | ✅ | Gmail / SendGrid |
| `SMTP_USER` | ❌ | ✅ | ✅ | — |
| `SMTP_PASS` | ❌ | ✅ | ✅ | Gmail App Password |
| `EMAIL_FROM` | default | ✅ | ✅ | — |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` | `sk_test_…` | `sk_live_…` | Paystack |
| `PAYSTACK_PUBLIC_KEY` | `pk_test_…` | `pk_test_…` | `pk_live_…` | Paystack |
| `OPENAI_API_KEY` | ✅ | ✅ | ✅ | OpenAI |
| `FRONTEND_URL` | `http://localhost:5173` | staging URL | production URL | — |
| `CORS_ORIGIN` | `http://localhost:5173` | staging URL | production URL | — |
| `CLOUDINARY_CLOUD_NAME` | ❌ (placeholders) | optional | ✅ recommended | Cloudinary |
| `CLOUDINARY_API_KEY` | ❌ | optional | ✅ | Cloudinary |
| `CLOUDINARY_API_SECRET` | ❌ | optional | ✅ | Cloudinary |
| `SENTRY_DSN` | ❌ | optional | ✅ recommended | Sentry |
| `NODE_ENV` | `development` | `staging` | `production` | — |
| `PORT` | `5000` | Railway auto | Railway auto | — |

---

## Service-by-Service Setup

### MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create or select your cluster (`SmartEdAfricanCluster`)
3. **Network Access** → Add IP address:
   - `0.0.0.0/0` for Railway (dynamic IPs) — or lock to Railway's static IP if on a Pro plan
4. **Database Access** → Ensure your user has `readWrite` on the `smarted` database
5. **Connect** → "Connect your application" → Node.js 5.x → copy URI

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<AppName>
```

> The backend reads both `MONGO_URI` and `MONGODB_URI` — use whichever name your platform prefers.

---

### Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your database (`above-tiger-114950`)
3. **Details** page → copy:
   - **Endpoint** → `REDIS_HOST`
   - **Port** → `REDIS_PORT` (usually `6379`)
   - **Password** → `REDIS_PASSWORD` (the long token)

```
REDIS_HOST=above-tiger-114950.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=<your-upstash-token>
REDIS_TLS=true
```

> `REDIS_TLS=true` is **required** for Upstash — connections without TLS are rejected.

---

### Railway (Backend + AI Service)

Railway injects `PORT` automatically. Set all other variables in the Railway dashboard:

**Backend service variables:**
```
NODE_ENV=production
MONGODB_URI=<atlas-uri>
REDIS_HOST=above-tiger-114950.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-token>
REDIS_TLS=true
JWT_SECRET=<64-byte-hex>
REFRESH_SECRET=<64-byte-hex>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=smartedafrica01@gmail.com
SMTP_PASS=<gmail-app-password>
EMAIL_FROM=no-reply@smarted.africa
PAYSTACK_SECRET_KEY=<sk_live_or_test>
PAYSTACK_PUBLIC_KEY=<pk_live_or_test>
FRONTEND_URL=https://<your-vercel-domain>
CORS_ORIGIN=https://<your-vercel-domain>
CLOUDINARY_CLOUD_NAME=<optional>
CLOUDINARY_API_KEY=<optional>
CLOUDINARY_API_SECRET=<optional>
SENTRY_DSN=<optional>
```

**AI service variables:**
```
OPENAI_API_KEY=<your-key>
CORS_ORIGINS=https://<your-vercel-domain>
BACKEND_URL=https://<your-railway-backend-domain>
SESSION_TTL_SECONDS=1800
MAX_HISTORY_TURNS=20
MONTHLY_TOKEN_CAP=50000
```

Railway auto-detects the Dockerfile in each service directory. Point each service to the correct subdirectory:
- Backend: root context `backend/`
- AI service: root context `AI-ML/`

---

### Vercel (Frontend)

Vercel builds the frontend. Set these as **Environment Variables** in the Vercel dashboard (Project → Settings → Environment Variables):

```
VITE_API_URL=https://<your-railway-backend-domain>/api/v1
VITE_AI_URL=https://<your-railway-ai-domain>
```

> These are **build-time** variables baked into the bundle — they are NOT secrets. Do not set `VITE_` variables for secret values.

The `frontend/vercel.json` already handles SPA routing (all paths → `index.html`) and sets security headers.

**Build settings** (Vercel auto-detects, but confirm):
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `frontend`

---

### Cloudinary (Optional — Course Images)

Without Cloudinary the backend falls back to placeholder image URLs. To enable real uploads:

1. Go to [cloudinary.com/console](https://cloudinary.com/console)
2. Copy **Cloud Name**, **API Key**, **API Secret**

```
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

---

### Gmail SMTP (Email Confirmation + Password Reset)

1. Go to your Google Account → Security → **App Passwords**
2. Generate an app password for "Mail" + "Other (SmartEd Africa)"
3. Use the 16-character app password (NOT your Google account password)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=smartedafrica01@gmail.com
SMTP_PASS=<16-char-app-password>
EMAIL_FROM=no-reply@smarted.africa
```

---

### Generating Secure Secrets

```bash
# Generate JWT_SECRET and REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run twice — once for `JWT_SECRET`, once for `REFRESH_SECRET`. Never reuse the same value for both.

---

## Local Development

Copy `.env.example` to `.env` at the project root:

```bash
cp .env.example .env
```

For local dev without all services running:
- Backend connects to local MongoDB (`mongodb://localhost:27017/smarted_dev`) if `MONGO_URI` is empty
- Redis falls back gracefully (auth tokens won't persist across restarts)
- Email sends are logged to console in test mode
- Cloudinary uploads use placeholder URLs

Minimal `.env` for local dev:
```
JWT_SECRET=dev_only_not_for_production_change_me
REFRESH_SECRET=dev_only_not_for_production_change_me_2
SMTP_HOST=smtp.gmail.com
SMTP_USER=smartedafrica01@gmail.com
SMTP_PASS=<app-password>
PAYSTACK_SECRET_KEY=sk_test_0c7e...
PAYSTACK_PUBLIC_KEY=pk_test_b3f0...
OPENAI_API_KEY=sk-...
```
