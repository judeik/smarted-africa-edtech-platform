# Vercel Deployment Checklist

One service: **`smarted-frontend`** (React + Vite PWA).

---

## Before You Start

- [ ] Render backend URL is known: `https://smarted-backend.onrender.com`
- [ ] Render AI service URL is known: `https://smarted-ai.onrender.com`
- [ ] GitHub repo is connected to Vercel (or will be during this step)

---

## Step 1: Create Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** → select `judeik/smarted-africa-edtech-platform`
3. **Root Directory:** `frontend` ← **critical** — must be `frontend`, not the repo root

### Auto-detected settings (verify these match):

| Setting | Expected Value |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |
| Node.js Version | 22.x |

If any are wrong, override them manually.

---

## Step 2: Set Environment Variables

Go to **Environment Variables** section before clicking Deploy:

| Variable | Value | Environment |
|---|---|---|
| `VITE_API_URL` | `https://smarted-backend.onrender.com/api/v1` | Production, Preview, Development |
| `VITE_AI_URL` | `https://smarted-ai.onrender.com` | Production, Preview, Development |
| `VITE_SENTRY_DSN` | Your Sentry browser DSN | Production only (optional) |

> **Important:** VITE_ variables are baked into the JavaScript bundle at build time — they are public. Never use them for secrets.

---

## Step 3: Deploy

- [ ] Click **Deploy**
- [ ] Monitor build logs — should complete in 60-90 seconds
- [ ] Build command: `npm run build` (runs `tsc -b && vite build`)
- [ ] Expected output: `✓ built in Xs` with no errors

---

## Post-Deploy Verification

### Check the deployment

```bash
VERCEL_URL=https://your-app.vercel.app

# 1. Landing page loads
curl -s -o /dev/null -w "%{http_code}" $VERCEL_URL
# Expected: 200

# 2. SPA routing works (deep links serve index.html)
curl -s -o /dev/null -w "%{http_code}" $VERCEL_URL/courses
# Expected: 200 (not 404)

# 3. PWA manifest is valid
curl -s $VERCEL_URL/manifest.webmanifest | python3 -m json.tool
# Expected: valid JSON with name, icons, start_url

# 4. Service worker is served without cache
curl -sI $VERCEL_URL/sw.js | grep -i cache-control
# Expected: no-cache, no-store, must-revalidate

# 5. Assets are cached immutably
curl -sI "$VERCEL_URL/assets/index-$(ls /tmp 2>/dev/null || echo 'xxx').js" 2>/dev/null || true
# (check any /assets/*.js file manually) Expected: Cache-Control: max-age=31536000, immutable

# 6. Security headers present
curl -sI $VERCEL_URL | grep -i "content-security-policy\|x-frame-options\|referrer-policy"
# Expected: all three headers present
```

- [ ] Page loads without blank screen or console errors
- [ ] "Login" and "Sign Up" buttons visible in navbar
- [ ] AI chat bubble visible bottom-right
- [ ] Courses page shows cards (demo mode is acceptable)
- [ ] Auth modal opens and accepts input
- [ ] Browser DevTools Console shows zero errors

---

## After Vercel Deploys: Update Render

Copy the Vercel URL and update both Render services:

**Render Backend** (`smarted-backend` → Environment):
```
FRONTEND_URL = https://your-app.vercel.app
CORS_ORIGIN  = https://your-app.vercel.app
```

**Render AI Service** (`smarted-ai` → Environment):
```
CORS_ORIGINS = https://your-app.vercel.app
```

Trigger a **Manual Deploy** on both Render services after updating these.

---

## Vercel Resources That Will Be Created

| Resource | Type | Plan |
|---|---|---|
| `smarted-frontend` | Web deployment | Hobby (free) or Pro |
| Vercel CDN edges | Global CDN | Included |
| SSL certificate | Auto-provisioned | Included |

**Cost:** Free on Hobby plan for open-source projects.

---

## Vercel Permissions Required

| Permission | Scope | Reason |
|---|---|---|
| GitHub OAuth | `read:user`, `user:email` | Vercel account creation |
| GitHub Repo access | `contents:read` | Read source code |
| GitHub Webhooks | `write` | Auto-deploy on push |
| GitHub Deployment status | `write` | Show deploy status on commits |
| GitHub Pull Request checks | `write` | Preview deployments on PRs |

Vercel uses GitHub OAuth App — no personal access token needed.

---

## Vercel Compatibility Verification

| Check | Status |
|---|---|
| Vite framework auto-detection | ✅ Vercel detects `vite.config.ts` |
| SPA routing (`/* → /index.html`) | ✅ Configured in `vercel.json` rewrites |
| PWA service worker files (no immutable cache) | ✅ `/(sw.js\|workbox-*.js)` rule in `vercel.json` |
| Hashed asset long-term caching | ✅ `/assets/(.*)` 1-year immutable in `vercel.json` |
| Content-Security-Policy | ✅ Allows `*.onrender.com` and `*.sentry.io` |
| Security headers | ✅ X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Root directory override | ✅ Must set to `frontend` in Vercel dashboard |
| Build env vars | ✅ `VITE_API_URL` and `VITE_AI_URL` set in dashboard |
| TypeScript compilation | ✅ `tsc -b` runs before Vite build |
| PWA installability | ✅ `manifest.webmanifest` + icons present |
| Node.js 22 build environment | ✅ Vercel supports Node 22 |

---

## Custom Domain (Optional)

To use a custom domain (e.g., `app.smarted.africa`):

1. Vercel Dashboard → Project → Settings → Domains
2. Add `app.smarted.africa`
3. Vercel provides DNS records to add at your registrar
4. After DNS propagates, update Render backend:
   - `FRONTEND_URL` = `https://app.smarted.africa`
   - `CORS_ORIGIN` = `https://app.smarted.africa`
5. Update Render AI service:
   - `CORS_ORIGINS` = `https://app.smarted.africa`
6. Update Vercel CSP in `vercel.json` to add custom domain to `connect-src`
7. Redeploy all services

---

## Preview Deployments

Vercel automatically creates preview deployments for every pull request. These use the same `VITE_API_URL` and `VITE_AI_URL` values set in Vercel. Preview URLs point to production Render services, which is acceptable for testing but means PRs can affect production data. Consider creating a staging Render environment for isolation.
