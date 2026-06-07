# DevOps Launch Audit

**Date:** 2026-06-07  
**Auditor:** Senior DevOps review (Claude Sonnet 4.6)  
**Scope:** Deployment configs, secrets management, Docker, CI/CD, Railway, Vercel, MongoDB Atlas, Redis/Upstash, production env vars  
**Final Score:** **7.5 / 10** — Ready to launch after applying fixes in this report

---

## Summary Scorecard

| Category | Score | Status |
|---|---|---|
| Secrets management | 7/10 | REFRESH_SECRET unguarded (fixed) |
| Docker setup | 8/10 | Single-process AI service, no HEALTHCHECK (fixed) |
| CI/CD workflows | 6/10 | Broken lint gate, no E2E on PRs, audit non-blocking (fixed) |
| Railway readiness | 8/10 | No graceful shutdown (fixed) |
| Vercel readiness | 8/10 | No CSP, no SW cache headers (fixed) |
| MongoDB Atlas | 8/10 | No pool sizing (fixed) |
| Redis/Upstash | 9/10 | TLS already wired |
| Production env vars | 7/10 | Only JWT_SECRET validated at startup (REFRESH_SECRET fixed) |

---

## Findings

---

### FINDING-01 — Lint PR gate has never worked

**Severity: CRITICAL**

**File:** `frontend/.github/workflows/lint.yml`

**Risk:** Every merged PR bypassed lint checks. The lint workflow runs `npm run lint` from the repository root, but the root `package.json` has zero scripts — only `@playwright/test` as a dev dependency. Any `npm run lint` at root would fail with "missing script: lint" and never actually lint the frontend.

**Impact:** ESLint errors could merge to `main` undetected. The 19 ESLint errors found during the verification audit could have entered the codebase through any PR without this gate catching them.

**Fix applied:**
- Set `working-directory: frontend`
- Upgraded `actions/checkout@v3` → `@v4`
- Replaced `npm install` (non-deterministic) with `npm ci`
- Added `actions/setup-node@v4` with npm caching

---

### FINDING-02 — `REFRESH_SECRET` not validated at production startup

**Severity: CRITICAL**

**File:** `backend/src/config/env.js`

**Risk:** `JWT_SECRET` was wrapped in `required()` (process.exit(1) if missing in production), but `REFRESH_SECRET` was not. If `REFRESH_SECRET` is absent in the Railway environment, the app silently starts using the known public fallback `'dev_refresh_secret_CHANGE_IN_PRODUCTION'`.

**Impact:** An attacker who reads the open-source repository can forge valid refresh tokens for any user ID, gaining permanent authenticated access to any account. This is a full authentication bypass.

**Fix applied:** `REFRESH_SECRET` is now wrapped in `required()`. The server will exit(1) at startup if the variable is missing in production, preventing the unsafe default from ever reaching users.

---

### FINDING-03 — `npm audit` failures were non-blocking in CI

**Severity: HIGH**

**File:** `.github/workflows/ci.yml` (both backend and frontend jobs)

**Risk:** Both security audit steps had `continue-on-error: true`, meaning a `CRITICAL` or `HIGH` npm vulnerability would be printed to logs but would not fail the pipeline. Code with known RCE or auth-bypass CVEs in dependencies could ship to production.

**Impact:** Dependency vulnerabilities could go unnoticed indefinitely. `continue-on-error` is typically a workaround for flaky steps — it should never be applied to a security gate.

**Fix applied:** Removed `continue-on-error: true` from both `npm audit --audit-level=high` steps. The pipeline will now fail if high or critical vulnerabilities are found.

> **Note:** If existing dependencies have known-safe CVEs, add them to `.nsprc` or use `npm audit --audit-level=high --ignore ...` rather than blanket `continue-on-error`.

---

### FINDING-04 — No graceful HTTP server shutdown (Railway SIGTERM)

**Severity: HIGH**

**File:** `backend/server.js`

**Risk:** `db.js` registered SIGTERM/SIGINT handlers to close MongoDB, but the HTTP server was never closed first. When Railway sends SIGTERM before a redeploy, the process received it and immediately closed the database connection — while in-flight HTTP requests were still being processed. Those requests would hit a closed DB and return 500s.

**Impact:** Every Railway deploy caused ~10s of 500 errors for active users. Payment verifications, enrollment completions, and email confirmations happening at deploy time would silently fail.

**Fix applied:** `server.js` now:
1. Captures the return value of `app.listen()` (the `http.Server` instance)
2. Calls `server.close()` on SIGTERM/SIGINT — stops accepting new connections, drains existing ones
3. Only then closes the MongoDB connection
4. Force-exits after 9 seconds (Railway's SIGKILL window is ~10s)
5. Removed the duplicate SIGTERM handlers from `db.js` that are now superseded

---

### FINDING-05 — AI service uses single-process `uvicorn` in production

**Severity: HIGH**

**File:** `AI-ML/Dockerfile`

**Risk:** `uvicorn` runs as a single async process. While FastAPI/uvicorn handles async concurrency well, a single process can only use one CPU core and a synchronous blocking call anywhere in the handler (e.g., the `threading.Lock` in `SessionStore`) can block all requests.

**Impact:** Under concurrent load (e.g., multiple students chatting simultaneously), requests queue behind one another. The SessionStore's threading Lock is called on every request — if the cleanup loop holds the lock, all concurrent requests stall.

**Fix applied:** Changed `CMD` to use `gunicorn` with `UvicornWorker` (already in `requirements.txt`). Default 2 workers; override with `GUNICORN_WORKERS` env var in Railway. Added `--graceful-timeout 30` so in-flight streaming responses complete before worker restart.

---

### FINDING-06 — Backend standalone CI missing `REFRESH_SECRET`

**Severity: HIGH**

**File:** `backend/.github/workflows/ci.yml`

**Risk:** The backend-specific CI (triggered on `backend/**` path changes) set `JWT_SECRET` but not `REFRESH_SECRET`. After FINDING-02's fix (`required('REFRESH_SECRET')`), the backend CI would exit(1) on startup because the required env var is absent.

**Impact:** Every push to `backend/**` would fail CI immediately, blocking all backend development.

**Fix applied:** Added `REFRESH_SECRET: test_refresh_secret_for_ci_only` to the test job env.

---

### FINDING-07 — E2E tests only ran on pushes to `main`, not on PRs

**Severity: MEDIUM**

**File:** `.github/workflows/ci.yml`

**Risk:** The `e2e-tests` job had `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Pull requests never triggered E2E. A PR could break the auth modal, landing page, or chat UI and merge before anyone noticed.

**Impact:** The 3 E2E regressions found in the verification audit (auth modal hidden by loading state, missing Sign Up button) passed the PR gate because E2E was never run against them.

**Fix applied:** Changed condition to `github.ref == 'refs/heads/main' || github.event_name == 'pull_request'`. E2E now runs on every PR.

---

### FINDING-08 — MongoDB connection pool not sized for production

**Severity: MEDIUM**

**File:** `backend/src/config/db.js`

**Risk:** Mongoose defaults to `maxPoolSize: 5`. At peak load (200 concurrent API requests, limited by `apiLimiter`), queries queue waiting for one of 5 connections. MongoDB Atlas free tier (M0) allows 500 connections; even M2 allows significantly more.

**Impact:** Under moderate load, query latency increases sharply. Payment verifications, which must be fast to avoid Paystack timeouts, are most vulnerable.

**Fix applied:** Set `maxPoolSize: 20`, `minPoolSize: 2`, `socketTimeoutMS: 45000`. 20 connections is appropriate for Railway's single-instance Node.js deployment.

---

### FINDING-09 — No Content-Security-Policy on Vercel frontend

**Severity: MEDIUM**

**File:** `frontend/vercel.json`

**Risk:** The frontend had X-Frame-Options and X-Content-Type-Options but no `Content-Security-Policy`. Without CSP, a stored XSS attack (e.g., malicious content in a course title or review) could exfiltrate auth tokens or make requests on behalf of users.

**Impact:** Any successful XSS in the frontend (including third-party scripts) has unrestricted access to `localStorage` where JWT tokens are stored.

**Fix applied:** Added `Content-Security-Policy` header scoped to `self` with explicit allowances for Railway backend and Upstash domains. Also added `Permissions-Policy` to deny camera/microphone/geolocation. Also added a dedicated no-cache rule for `sw.js` and workbox files (service workers must not be cached immutably).

> **Note:** The CSP uses `unsafe-inline` and `unsafe-eval` for scripts/styles because Vite/React inject inline scripts. After launch, tighten to nonce-based CSP if XSS risk increases.

---

### FINDING-10 — Docker port exposure in docker-compose (MongoDB + Redis)

**Severity: MEDIUM**

**File:** `docker-compose.yml`

**Risk:** MongoDB (27017) and Redis (6379) are bound to `0.0.0.0` via the `ports:` directive. On any server where `docker compose up` is run, these databases are accessible from any IP that can reach the host.

**Impact:** If the Docker Compose deployment is used on a VPS (not Railway), the databases are internet-exposed. Default credentials (`smartedpass`, `redispass`) are in `.env.example` and are commonly dictionary-attacked.

**Fix not applied to docker-compose.yml** (would break local dev workflow where port access is needed). For production VPS deployment, override with `docker-compose.prod.yml`:

```yaml
# docker-compose.prod.yml — overlay to remove DB port exposure
services:
  mongodb:
    ports: []
  redis:
    ports: []
```

Run with: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

---

### FINDING-11 — `lint.yml` used `npm install` instead of `npm ci`

**Severity: MEDIUM** *(part of FINDING-01 fix)*

`npm install` resolves and potentially upgrades dependencies on each CI run, making builds non-deterministic and able to introduce breaking changes automatically. Always use `npm ci` in CI.

**Fix applied:** Changed to `npm ci` in `lint.yml`.

---

### FINDING-12 — Dockerfiles had no `HEALTHCHECK` instructions

**Severity: LOW**

**Files:** `backend/Dockerfile`, `AI-ML/Dockerfile`

**Risk:** Without `HEALTHCHECK`, Docker reports containers as healthy as soon as they start — even if the app hasn't bound its port yet. This affects `docker compose` health-dependent startup ordering and any Kubernetes/ECS deployment.

**Impact:** Low for Railway (uses HTTP health checks configured separately), but becomes a blocker if the project moves to Kubernetes or Docker Swarm.

**Fix applied:** Added `HEALTHCHECK` to both Dockerfiles using `wget` (already present in Alpine images). Backend pings `/api/health`, AI service pings `/health`.

---

### FINDING-13 — AI service `@app.on_event("startup")` deprecated

**Severity: LOW**

**File:** `AI-ML/openai_api.py`

**Risk:** FastAPI deprecated `@app.on_event()` in v0.93. While still functional, it will emit deprecation warnings and will be removed in a future FastAPI version.

**Impact:** None today; will break on FastAPI upgrade.

**Fix not implemented** (functional, low risk). Migrate to `@app.lifespan` before upgrading FastAPI past 0.110.

```python
# Replacement pattern:
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(cleanup_loop())
    yield

app = FastAPI(lifespan=lifespan, ...)
```

---

### FINDING-14 — Empty `vendor` chunk in Vite build

**Severity: LOW**

**File:** `frontend/vite.config.ts`

**Risk:** `manualChunks` splits `['react', 'react-dom']` into a `vendor` chunk, but these packages may be tree-shaken or inlined elsewhere, resulting in a 0-byte chunk (`Generated an empty chunk: "vendor"`).

**Impact:** Cosmetic warning; no functional impact.

**Fix not implemented.** Remove `vendor: ['react', 'react-dom']` from `manualChunks` in `vite.config.ts` to eliminate the warning. The other chunks (ui, store, charts, sentry) are valid.

---

## Items Requiring Manual Action (Not Auto-fixable)

### Railway Configuration

These must be done in the Railway dashboard — they cannot be fixed in code:

1. **Set all environment variables** per `docs/environment-setup.md` before first deploy
2. **Set health check path** to `/api/health` for the backend service
3. **Set `GUNICORN_WORKERS`** env var for the AI service (recommend `2` for starter plan, `4` for Pro)
4. **Enable auto-deploy** from `main` branch only (not `develop`)

### MongoDB Atlas

1. **Add Railway's outbound IP** to Atlas Network Access (or `0.0.0.0/0` if on Railway's Hobby plan with dynamic IPs)
2. **Enable Atlas backups** — M0 free tier has no PITR; upgrade to M2+ or set up `mongodump` cron

### Vercel Configuration

1. **Set Root Directory to `frontend`** in Project Settings
2. **Set `VITE_API_URL`** and `VITE_AI_URL` as Environment Variables (not secrets — they're build-time public values)
3. **Redeploy after every Railway domain change** (VITE_ vars are baked into the bundle at build time)

---

## Complete Fix Registry

| # | Finding | Severity | Status | File(s) Changed |
|---|---|---|---|---|
| 01 | Lint PR gate broken (wrong directory, old action, npm install) | Critical | ✅ Fixed | `frontend/.github/workflows/lint.yml` |
| 02 | `REFRESH_SECRET` not validated at production startup | Critical | ✅ Fixed | `backend/src/config/env.js` |
| 03 | `npm audit` failures non-blocking in CI | High | ✅ Fixed | `.github/workflows/ci.yml` |
| 04 | No graceful HTTP server shutdown | High | ✅ Fixed | `backend/server.js` |
| 05 | AI service single-process uvicorn | High | ✅ Fixed | `AI-ML/Dockerfile` |
| 06 | Backend standalone CI missing `REFRESH_SECRET` | High | ✅ Fixed | `backend/.github/workflows/ci.yml` |
| 07 | E2E tests not run on PRs | Medium | ✅ Fixed | `.github/workflows/ci.yml` |
| 08 | MongoDB connection pool undersized | Medium | ✅ Fixed | `backend/src/config/db.js` |
| 09 | No CSP / missing SW cache headers in Vercel | Medium | ✅ Fixed | `frontend/vercel.json` |
| 10 | Docker Compose exposes DB ports (prod risk) | Medium | 📋 Documented | Manual `docker-compose.prod.yml` override |
| 11 | `npm install` in CI (non-deterministic) | Medium | ✅ Fixed | `frontend/.github/workflows/lint.yml` |
| 12 | No `HEALTHCHECK` in Dockerfiles | Low | ✅ Fixed | `backend/Dockerfile`, `AI-ML/Dockerfile` |
| 13 | FastAPI `@app.on_event` deprecated | Low | 📋 Documented | Migrate before FastAPI upgrade |
| 14 | Empty vendor chunk warning | Low | 📋 Documented | Remove from `vite.config.ts` after launch |

---

## Launch Readiness Score: 7.5 / 10

### Breakdown

| Dimension | Score | Rationale |
|---|---|---|
| Security | 7/10 | REFRESH_SECRET now guarded; CSP added; no secrets scanning (gitleaks) yet |
| Reliability | 8/10 | Graceful shutdown + connection pool fixed; no circuit breaker on Paystack |
| Observability | 7/10 | Sentry wired but optional; pino logging present; no uptime monitoring configured |
| CI/CD correctness | 8/10 | All three issues fixed; no secret scanning step in pipeline |
| Infrastructure hardening | 7/10 | Dockerfiles hardened; Docker Compose DB ports require manual prod override |
| Deployment automation | 6/10 | No `railway.json`; Railway config is fully manual; no staging environment |

### What Raises the Score Post-Launch

To reach **9/10**, add after launch:
- Secrets scanning (gitleaks) as a CI step
- `railway.json` for repeatable Railway configuration-as-code
- Staging environment with Railway + branch deploys
- MongoDB Atlas M2+ for point-in-time restore backups
- Uptime monitoring (Betterstack / UptimeRobot) hitting `/api/health`

### Launch Verdict

**The codebase is safe to deploy after this audit's fixes.** The two Critical issues (broken lint gate, unguarded refresh secret) are now fixed. The High issues (no graceful shutdown, single-process AI, non-blocking audit) are fixed. No blocking issues remain for Railway + Vercel + Atlas + Upstash deployment.
