# Render Deployment Checklist

Two services: **`smarted-backend`** (Node.js) and **`smarted-ai`** (Python/FastAPI).

---

## Before You Start

- [ ] MongoDB Atlas cluster is running and accessible
- [ ] Upstash Redis database is created
- [ ] `JWT_SECRET` and `REFRESH_SECRET` have been generated (64-byte hex each, different values)
- [ ] Gmail App Password has been created for `smartedafrica01@gmail.com`
- [ ] Paystack keys are ready (`sk_live_` / `sk_test_`)
- [ ] OpenAI API key is ready
- [ ] Vercel frontend domain is known (deploy Vercel first if possible, or fill in after)

---

## Option A — Deploy via Render Blueprint (Recommended)

The `render.yaml` at the repo root defines both services.

### Step 1: Create Blueprint

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **New** → **Blueprint**
3. Connect your GitHub account if not already connected
4. Select repository: `judeik/smarted-africa-edtech-platform`
5. Branch: `main`
6. Render scans for `render.yaml` and shows both services

### Step 2: Fill Secret Variables

Render prompts for all `sync: false` variables. Fill each one:

**Backend (`smarted-backend`) secrets:**
- [ ] `MONGODB_URI` — Atlas connection string
- [ ] `REDIS_HOST` — Upstash endpoint
- [ ] `REDIS_PASSWORD` — Upstash token
- [ ] `JWT_SECRET` — 64-byte hex
- [ ] `REFRESH_SECRET` — 64-byte hex (different from JWT_SECRET)
- [ ] `SMTP_USER` — Gmail address
- [ ] `SMTP_PASS` — Gmail App Password
- [ ] `PAYSTACK_SECRET_KEY` — `sk_live_...` or `sk_test_...`
- [ ] `PAYSTACK_PUBLIC_KEY` — `pk_live_...` or `pk_test_...`
- [ ] `FRONTEND_URL` — leave blank for now, fill after Vercel deploy
- [ ] `CORS_ORIGIN` — leave blank for now, same as FRONTEND_URL
- [ ] `CLOUDINARY_CLOUD_NAME` — optional
- [ ] `CLOUDINARY_API_KEY` — optional
- [ ] `CLOUDINARY_API_SECRET` — optional
- [ ] `SENTRY_DSN` — optional

**AI Service (`smarted-ai`) secrets:**
- [ ] `OPENAI_API_KEY` — `sk-...`
- [ ] `CORS_ORIGINS` — leave blank for now, fill after Vercel deploy
- [ ] `BACKEND_URL` — leave blank for now, fill after backend deploys

### Step 3: Apply Blueprint
- [ ] Click **Apply**
- [ ] Monitor build logs for both services

---

## Option B — Manual Service Creation

### Backend Service

1. **New** → **Web Service** → connect GitHub repo
2. Settings:
   - **Name:** `smarted-backend`
   - **Runtime:** Docker
   - **Dockerfile Path:** `./backend/Dockerfile`
   - **Docker Build Context Directory:** `./backend`
   - **Branch:** `main`
   - **Region:** Frankfurt
   - **Plan:** Starter ($7/mo) — free tier spins down after 15 min
3. **Health Check Path:** `/api/health`
4. Set all environment variables from `docs/production-env-matrix.md`

### AI Service

1. **New** → **Web Service** → same repo
2. Settings:
   - **Name:** `smarted-ai`
   - **Runtime:** Docker
   - **Dockerfile Path:** `./AI-ML/Dockerfile`
   - **Docker Build Context Directory:** `./AI-ML`
   - **Branch:** `main`
   - **Region:** Frankfurt
   - **Plan:** Starter
3. **Health Check Path:** `/health`
4. Set all environment variables from `docs/production-env-matrix.md`

---

## Post-Deploy Steps

### Verify Both Services Are Healthy

```bash
# Should return { "status": "ok", "env": "production", ... }
curl https://smarted-backend.onrender.com/api/health

# Should return { "status": "ok", "service": "smarted-ai", ... }
curl https://smarted-ai.onrender.com/health
```

- [ ] Backend health check returns 200
- [ ] AI service health check returns 200
- [ ] Backend logs show: `MongoDB connected` and `[redis] Connected`
- [ ] AI service logs show: gunicorn workers starting

### Copy Service URLs

After services deploy, note these URLs:
```
Backend: https://smarted-backend.onrender.com   (or your custom name)
AI:      https://smarted-ai.onrender.com
```

### Cross-Wire Variables

**In Render Backend service → Environment:**
- [ ] Set `FRONTEND_URL` = `https://your-app.vercel.app`
- [ ] Set `CORS_ORIGIN` = same as `FRONTEND_URL`
- [ ] Click **Save Changes** → triggers redeploy

**In Render AI service → Environment:**
- [ ] Set `CORS_ORIGINS` = `https://your-app.vercel.app`
- [ ] Set `BACKEND_URL` = `https://smarted-backend.onrender.com`
- [ ] Click **Save Changes** → triggers redeploy

### Set Paystack Webhook

- [ ] Go to [dashboard.paystack.com](https://dashboard.paystack.com) → Settings → API Keys & Webhooks
- [ ] Webhook URL: `https://smarted-backend.onrender.com/api/v1/payments/webhook`
- [ ] Save

### Seed Admin Account

- [ ] Render Dashboard → `smarted-backend` service → **Shell** tab
- [ ] Run:
  ```bash
  ADMIN_EMAIL=admin@yourdomain.com \
  ADMIN_PASSWORD=YourStrongPass1! \
  ADMIN_NAME="SmartEd Admin" \
  node scripts/seedAdmin.js
  ```
- [ ] Confirm: `Admin user created successfully`

---

## Render Resources That Will Be Created

| Resource | Type | Plan | Region |
|---|---|---|---|
| `smarted-backend` | Web Service | Starter ($7/mo) | Frankfurt |
| `smarted-ai` | Web Service | Starter ($7/mo) | Frankfurt |

**Total Render cost:** ~$14/month (2 × Starter)

> The **free tier is not viable for production** — services spin down after 15 min of inactivity causing 30-60s cold starts on first request.

---

## Render Permissions Required

To deploy via GitHub integration:

| Permission | Scope | Reason |
|---|---|---|
| GitHub OAuth | `read:user`, `user:email` | Render account creation |
| GitHub Repo access | `contents:read` | Read source code and Dockerfile |
| GitHub Webhooks | `write` | Auto-deploy on push to `main` |
| GitHub Status checks | `write` | Show deploy status on commits |

Render does NOT require a personal access token — it uses GitHub OAuth App authorization.

---

## Render Compatibility Verification

| Check | Status |
|---|---|
| Node.js 22 Alpine Docker image | ✅ Supported |
| Python 3.11 slim Docker image | ✅ Supported |
| Multi-stage Docker builds | ✅ Supported |
| `PORT` env var injection | ✅ Supported — backend reads `process.env.PORT`, AI uses `${PORT:-8001}` |
| `SIGTERM` graceful shutdown | ✅ 30s window — server.js handles with 25s force-exit |
| Docker HEALTHCHECK | ✅ Render observes container health |
| HTTP health check path | ✅ `/api/health` and `/health` both return 200 |
| Monorepo with separate Docker contexts | ✅ `dockerfilePath` + `dockerContext` in render.yaml |
| Auto-deploy on `main` push | ✅ `autoDeploy: true` in render.yaml |
