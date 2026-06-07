# Render + Vercel Deployment Guide

**Stack:** Frontend → Vercel | Backend + AI Service → Render | Database → MongoDB Atlas | Cache → Upstash Redis

---

## Deployment Order

Deploy in this exact sequence — later services depend on URLs from earlier ones.

```
1. MongoDB Atlas     (no URL needed from other services)
2. Upstash Redis     (no URL needed from other services)
3. Render — Backend  (needs Atlas URI, Upstash creds)
4. Render — AI       (needs OPENAI_API_KEY, backend URL from step 3)
5. Vercel — Frontend (needs backend URL from step 3, AI URL from step 4)
6. Cross-wire        (set FRONTEND_URL + CORS_ORIGIN in backend; CORS_ORIGINS in AI)
```

---

## Service 1: MongoDB Atlas

### Setup
1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Cluster → **Connect** → **Drivers** → Node.js 5.x → copy URI
3. **Network Access** → Add IP `0.0.0.0/0` (Render uses dynamic IPs)
4. Confirm your DB user has `readWrite` on the `smarted` database

### Variable produced
```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=SmartEdAfricanCluster
```

---

## Service 2: Upstash Redis

### Setup
1. Log in to [console.upstash.com](https://console.upstash.com)
2. Select your database → **Details** tab
3. Copy **Endpoint**, **Port** (6379), and **Password**

### Variables produced
```
REDIS_HOST=above-tiger-114950.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=<token>
REDIS_TLS=true
```

> TLS is **required** — Upstash rejects non-TLS connections.

---

## Service 3: Render — Backend

### Option A: Blueprint (recommended)
1. [render.com/dashboard](https://render.com/dashboard) → **New** → **Blueprint**
2. Connect your GitHub repo → Render detects `render.yaml`
3. Fill in every `sync: false` variable when prompted (see table below)
4. Click **Apply** — Render builds both services

### Option B: Manual
1. **New** → **Web Service** → connect repo
2. Runtime: **Docker**
3. Dockerfile path: `./backend/Dockerfile`
4. Docker context: `./backend`
5. Branch: `main`
6. Plan: **Starter** ($7/mo) — free tier spins down after 15 min
7. Region: **Frankfurt** (closest to West Africa)
8. Health check path: `/api/health`

### Environment Variables (Backend)

Set these in the Render dashboard under the backend service → **Environment**:

| Variable | Value | Secret? |
|---|---|---|
| `NODE_ENV` | `production` | No |
| `PORT` | `5000` | No |
| `MONGODB_URI` | Atlas connection string | **Yes** |
| `REDIS_HOST` | Upstash endpoint | **Yes** |
| `REDIS_PORT` | `6379` | No |
| `REDIS_PASSWORD` | Upstash token | **Yes** |
| `REDIS_TLS` | `true` | No |
| `JWT_SECRET` | 64-char hex | **Yes** |
| `REFRESH_SECRET` | 64-char hex (different from JWT_SECRET) | **Yes** |
| `JWT_ACCESS_EXPIRES` | `15m` | No |
| `SMTP_HOST` | `smtp.gmail.com` | No |
| `SMTP_PORT` | `587` | No |
| `SMTP_USER` | `smartedafrica01@gmail.com` | **Yes** |
| `SMTP_PASS` | Gmail 16-char app password | **Yes** |
| `EMAIL_FROM` | `no-reply@smarted.africa` | No |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` or `sk_test_...` | **Yes** |
| `PAYSTACK_PUBLIC_KEY` | `pk_live_...` or `pk_test_...` | **Yes** |
| `FRONTEND_URL` | `https://your-app.vercel.app` | No — set after Vercel |
| `CORS_ORIGIN` | same as `FRONTEND_URL` | No — set after Vercel |
| `CLOUDINARY_CLOUD_NAME` | your cloud name | **Yes** (optional) |
| `CLOUDINARY_API_KEY` | your API key | **Yes** (optional) |
| `CLOUDINARY_API_SECRET` | your API secret | **Yes** (optional) |
| `SENTRY_DSN` | Sentry DSN | **Yes** (optional) |

### Generate secrets
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Run twice — once for JWT_SECRET, once for REFRESH_SECRET
```

### Verify deployment
```bash
curl https://smarted-backend.onrender.com/api/health
# Expected: { "status": "ok", "env": "production" }
```

---

## Service 4: Render — AI Service

### Using Blueprint
Render deploys this automatically alongside the backend via `render.yaml`.

### Manual setup
1. **New** → **Web Service** → same repo
2. Runtime: **Docker**
3. Dockerfile path: `./AI-ML/Dockerfile`
4. Docker context: `./AI-ML`
5. Health check path: `/health`
6. Region: **Frankfurt**

### Environment Variables (AI Service)

| Variable | Value | Secret? |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | **Yes** |
| `CORS_ORIGINS` | `https://your-app.vercel.app` | No — set after Vercel |
| `BACKEND_URL` | `https://smarted-backend.onrender.com` | No — set after backend |
| `SESSION_TTL_SECONDS` | `1800` | No |
| `MAX_HISTORY_TURNS` | `20` | No |
| `MONTHLY_TOKEN_CAP` | `50000` | No |
| `GUNICORN_WORKERS` | `2` | No |

### Verify deployment
```bash
curl https://smarted-ai.onrender.com/health
# Expected: { "status": "ok", "service": "smarted-ai" }
```

---

## Service 5: Vercel — Frontend

### Setup
1. [vercel.com/new](https://vercel.com/new) → Import from GitHub
2. **Root Directory**: `frontend` ← critical for monorepo
3. **Framework Preset**: Vite (auto-detected)
4. **Build Command**: `npm run build` (auto)
5. **Output Directory**: `dist` (auto)

### Environment Variables (Vercel)

Set under Project → Settings → Environment Variables:

| Variable | Value | Note |
|---|---|---|
| `VITE_API_URL` | `https://smarted-backend.onrender.com/api/v1` | Build-time, not a secret |
| `VITE_AI_URL` | `https://smarted-ai.onrender.com` | Build-time, not a secret |

> These are **baked into the JavaScript bundle** at build time. If Render URLs change, you must redeploy Vercel.

### Vercel configuration (`frontend/vercel.json`)
Already configured with:
- SPA routing rewrites (`/* → /index.html`)
- Content-Security-Policy allowing `*.onrender.com`
- 1-year immutable cache for hashed assets
- No-cache for service worker files (`sw.js`, `workbox-*.js`)
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Verify deployment
```bash
curl -s -o /dev/null -w "%{http_code}" https://your-app.vercel.app
# Expected: 200
curl -s https://your-app.vercel.app/manifest.webmanifest | python3 -m json.tool
# Expected: valid PWA manifest JSON
```

---

## Step 6: Cross-Wire Services

After all deployments succeed, update these variables:

**In Render — Backend service:**
```
FRONTEND_URL = https://your-app.vercel.app
CORS_ORIGIN  = https://your-app.vercel.app
```

**In Render — AI service:**
```
CORS_ORIGINS = https://your-app.vercel.app
BACKEND_URL  = https://smarted-backend.onrender.com
```

Trigger a manual redeploy on both Render services after setting these.

**In Vercel — Frontend:**
Confirm build env vars point to correct Render URLs, then redeploy:
```
VITE_API_URL = https://smarted-backend.onrender.com/api/v1
VITE_AI_URL  = https://smarted-ai.onrender.com
```

---

## Post-Deployment Smoke Tests

Run `docs/post-deployment-smoke-tests.md` with your live URLs.

Quick validation:

```bash
BACKEND=https://smarted-backend.onrender.com
AI=https://smarted-ai.onrender.com
FRONTEND=https://your-app.vercel.app

# 1. Health checks
curl -s $BACKEND/api/health | python3 -m json.tool
curl -s $AI/health | python3 -m json.tool

# 2. CORS
curl -I -X OPTIONS $BACKEND/api/v1/auth/login \
  -H "Origin: $FRONTEND" \
  -H "Access-Control-Request-Method: POST"
# Must see: access-control-allow-origin: $FRONTEND

# 3. Frontend loads
curl -s -o /dev/null -w "%{http_code}" $FRONTEND
# Must return 200
```

---

## Remaining Launch Blockers

### ⚠️ Render Free Tier Cold Starts

**Impact: High**

Render free web services spin down after 15 minutes of inactivity. The first request after a cold start takes 30–60 seconds, during which users see a timeout or error.

**Action required:** Use **Starter plan ($7/month)** for both services. Free tier is only acceptable for demos.

---

### ⚠️ Paystack Webhook URL

**Impact: High** — payments will not be confirmed without this.

After backend deploys, update the webhook URL in your Paystack dashboard:

```
https://smarted-backend.onrender.com/api/v1/payments/webhook
```

Dashboard: [dashboard.paystack.com](https://dashboard.paystack.com) → Settings → API Keys & Webhooks → Webhook URL

---

### ⚠️ MongoDB Atlas IP Allowlist

**Impact: Critical** — backend cannot connect to Atlas without this.

Render uses dynamic outbound IPs. You must either:
- Add `0.0.0.0/0` to Atlas Network Access (acceptable for early launch)
- Or upgrade to Render's **Static Outbound IP** add-on and whitelist those specific IPs

---

### ⚠️ Admin Seeding

After first deploy, seed the admin account:

```bash
# Using Render shell (Dashboard → Backend service → Shell)
node scripts/seedAdmin.js
```

Without this, no admin dashboard access is possible.

---

### ⚠️ VITE_ Build-Time Variable Lock-In

`VITE_API_URL` and `VITE_AI_URL` are baked into the frontend bundle at build time. If your Render service URLs change (e.g., you rename a service), you must trigger a Vercel redeploy.

**Mitigation:** Set stable custom domains on Render services (e.g., `api.smarted.africa`) so URLs never change.

---

## Environment Variable Summary

### Backend (Render)
```
NODE_ENV=production
MONGODB_URI=<atlas-uri>
REDIS_HOST=<upstash-host>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-token>
REDIS_TLS=true
JWT_SECRET=<64-byte-hex>
REFRESH_SECRET=<64-byte-hex>
JWT_ACCESS_EXPIRES=15m
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASS=<app-password>
EMAIL_FROM=no-reply@smarted.africa
PAYSTACK_SECRET_KEY=<key>
PAYSTACK_PUBLIC_KEY=<key>
FRONTEND_URL=https://<vercel-domain>
CORS_ORIGIN=https://<vercel-domain>
CLOUDINARY_CLOUD_NAME=<optional>
CLOUDINARY_API_KEY=<optional>
CLOUDINARY_API_SECRET=<optional>
SENTRY_DSN=<optional>
```

### AI Service (Render)
```
OPENAI_API_KEY=<key>
CORS_ORIGINS=https://<vercel-domain>
BACKEND_URL=https://smarted-backend.onrender.com
SESSION_TTL_SECONDS=1800
MAX_HISTORY_TURNS=20
MONTHLY_TOKEN_CAP=50000
GUNICORN_WORKERS=2
```

### Frontend (Vercel — build-time only)
```
VITE_API_URL=https://smarted-backend.onrender.com/api/v1
VITE_AI_URL=https://smarted-ai.onrender.com
```
