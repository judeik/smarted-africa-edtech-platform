# Production Deployment Checklist

SmartEd Africa deployment to: **MongoDB Atlas + Upstash Redis + Railway (backend + AI) + Vercel (frontend)**

Mark each item before going live.

---

## Phase 1 — Pre-Deployment (Do Locally)

### Code & Build

- [ ] `npm run lint` in `frontend/` → exits 0
- [ ] `npx tsc --noEmit` in `frontend/` → exits 0
- [ ] `npm run build` in `frontend/` → no errors
- [ ] `npm test` in `backend/` → 20/20 pass
- [ ] `npx playwright test --project=chromium` → 28/28 pass
- [ ] All changes committed and pushed to `main`

### Secrets Generation

- [ ] Generate `JWT_SECRET` → `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Generate `REFRESH_SECRET` → same command, different output
- [ ] Confirm both are ≥ 64 hex characters
- [ ] Confirm `JWT_SECRET ≠ REFRESH_SECRET`
- [ ] Store both in a password manager before pasting anywhere

### Paystack

- [ ] Test keys work in local dev (payment flow tested end-to-end)
- [ ] Decide: go live with `sk_live_` / `pk_live_` keys, or stay on test keys for soft launch
- [ ] Paystack dashboard → set webhook URL to: `https://<railway-backend>/api/v1/payments/webhook`

---

## Phase 2 — Infrastructure Setup

### MongoDB Atlas

- [ ] Cluster is running (M0 free tier or higher)
- [ ] Database user exists with `readWrite` on `smarted` database
- [ ] Network Access: `0.0.0.0/0` added (required for Railway dynamic IPs)
- [ ] Connection string tested locally: `mongosh "mongodb+srv://..."` connects
- [ ] **App Name** in URI matches Atlas project (e.g., `?appName=SmartEdAfricanCluster`)

### Upstash Redis

- [ ] Database exists in Upstash console
- [ ] TLS is enabled (all Upstash databases use TLS)
- [ ] Endpoint, port (6379), and password (token) copied
- [ ] Tested locally with `REDIS_TLS=true`:
  ```bash
  REDIS_HOST=above-tiger-114950.upstash.io REDIS_PORT=6379 \
  REDIS_PASSWORD=<token> REDIS_TLS=true node -e "
  import('./backend/src/config/redis.js').then(r=>r.default.ping().then(console.log))"
  ```

### Cloudinary (Optional)

- [ ] Cloud created at cloudinary.com
- [ ] Cloud name, API key, API secret copied
- [ ] Upload preset configured if using unsigned uploads

---

## Phase 3 — Railway Deployment

### Backend Service

- [ ] New Railway project created
- [ ] **New Service** → "Deploy from GitHub repo" → `main` branch
- [ ] Root directory set to `backend/`
- [ ] Dockerfile detected (Railway uses `backend/Dockerfile`)
- [ ] All environment variables set (see `docs/environment-setup.md`):
  - [ ] `NODE_ENV=production`
  - [ ] `MONGODB_URI` (Atlas connection string)
  - [ ] `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS=true`
  - [ ] `JWT_SECRET`, `REFRESH_SECRET`
  - [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
  - [ ] `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`
  - [ ] `FRONTEND_URL` (Vercel domain — fill in after Vercel deploy)
  - [ ] `CORS_ORIGIN` (same as `FRONTEND_URL`)
  - [ ] `CLOUDINARY_*` (if using)
  - [ ] `SENTRY_DSN` (if using)
- [ ] Railway generates a domain (e.g., `https://smarted-backend-xxx.up.railway.app`)
- [ ] Health check passes: `curl https://<railway-backend>/api/health` → `{"status":"ok"}`
- [ ] Deploy logs show: `MongoDB connected` and `[redis] Connected`

### AI Service

- [ ] **New Service** in same Railway project
- [ ] Root directory set to `AI-ML/`
- [ ] Environment variables set:
  - [ ] `OPENAI_API_KEY`
  - [ ] `CORS_ORIGINS=https://<vercel-domain>`
  - [ ] `BACKEND_URL=https://<railway-backend-domain>`
  - [ ] `SESSION_TTL_SECONDS=1800`
  - [ ] `MAX_HISTORY_TURNS=20`
  - [ ] `MONTHLY_TOKEN_CAP=50000`
- [ ] Health check: `curl https://<railway-ai>/health` → `{"status":"ok",...}`

---

## Phase 4 — Vercel Deployment

- [ ] New Vercel project → Import from GitHub
- [ ] **Root Directory**: `frontend`
- [ ] **Build Command**: `npm run build` (auto-detected)
- [ ] **Output Directory**: `dist` (auto-detected)
- [ ] Environment variables set:
  - [ ] `VITE_API_URL=https://<railway-backend>/api/v1`
  - [ ] `VITE_AI_URL=https://<railway-ai>`
- [ ] `frontend/vercel.json` is present (SPA routing + security headers)
- [ ] Deploy → visit production URL
- [ ] Landing page loads without console errors
- [ ] PWA manifest loads: `https://<vercel-domain>/manifest.webmanifest`

---

## Phase 5 — Cross-Service Wiring

After all three services have domains, update:

- [ ] Railway backend: `FRONTEND_URL` and `CORS_ORIGIN` → Vercel domain
- [ ] Railway AI: `CORS_ORIGINS` → Vercel domain
- [ ] Vercel: `VITE_API_URL` → Railway backend domain, `VITE_AI_URL` → Railway AI domain
- [ ] Trigger redeploys on all three services

---

## Phase 6 — Post-Deployment Smoke Tests

Run `docs/post-deployment-smoke-tests.md` against production URLs.

---

## Phase 7 — Go-Live

- [ ] Custom domain added to Vercel (if applicable)
- [ ] Custom domain added to Railway backend (if applicable)
- [ ] SSL certificates active on all domains (Vercel/Railway handle this automatically)
- [ ] Paystack webhook URL updated to production backend URL
- [ ] Monitoring / Sentry receiving events (test by triggering a 404)
- [ ] Admin account seeded: `node scripts/seedAdmin.js` (run via Railway CLI or shell)
- [ ] Demo content seeded (optional): `node scripts/seedDemo.js`

---

## Rollback Trigger Conditions

Immediately execute `docs/rollback-plan.md` if any of the following occur:

- Health check `GET /api/health` returns non-200 after deploy
- MongoDB connection errors in Railway logs
- Redis connection errors in Railway logs
- Auth flow (register → confirm → login) fails end-to-end
- Payment webhook returns 500
- Frontend loads blank page or shows React error boundary
