# Rollback Plan

This document covers how to recover from a bad production deployment across all three services.

---

## Rollback Decision Matrix

| Symptom | Severity | Action |
|---|---|---|
| `/api/health` returns non-200 | Critical | Rollback backend immediately |
| `MongoDB connected` missing from logs | Critical | Rollback backend immediately |
| Redis connection errors in logs | Critical | Rollback backend immediately |
| Auth flow broken (login/register fails) | Critical | Rollback backend |
| Payment webhook returning 500 | Critical | Rollback backend |
| Frontend blank page / JS crash | High | Rollback frontend |
| AI chat broken | Medium | Rollback AI service |
| Emails not sending | Medium | Fix env vars (SMTP), no rollback needed |
| Slow responses (>3s) | Low | Monitor, do not roll back immediately |

---

## Service 1: Railway — Backend

### Instant Rollback (< 2 minutes)

Railway keeps a full deployment history. To roll back:

1. Go to [railway.app](https://railway.app) → your project → **Backend** service
2. Click **Deployments** tab
3. Find the last known-good deploy
4. Click **⋯ → Redeploy** on that deployment

**CLI alternative:**
```bash
railway link             # select your project
railway deployments      # list recent deployments
# Note the deployment ID of the last good deploy, then:
# Railway UI is faster for rollback — use the dashboard
```

### Verify Rollback

```bash
curl https://<railway-backend>/api/health
# Must return: { "status": "ok" }
```

---

## Service 2: Railway — AI Service

### Instant Rollback (< 2 minutes)

Same process as backend:

1. Railway dashboard → **AI Service**
2. **Deployments** → find last good deploy → **Redeploy**

### Verify Rollback

```bash
curl https://<railway-ai>/health
# Must return: { "status": "ok", "service": "smarted-ai" }
```

---

## Service 3: Vercel — Frontend

### Instant Rollback (< 1 minute)

Vercel keeps every deployment permanently:

1. Go to [vercel.com](https://vercel.com) → your project → **Deployments**
2. Find the last deployment with a green checkmark
3. Click **⋯ → Promote to Production**

**CLI alternative:**
```bash
npx vercel ls                         # list recent deployments
npx vercel promote <deployment-url>   # promote to production
```

### Verify Rollback

```bash
curl -s -o /dev/null -w "%{http_code}" https://<vercel-domain>
# Must return: 200
```

---

## Database Rollback (MongoDB Atlas)

MongoDB Atlas does not auto-rollback on app rollback. If a bad migration corrupted data:

### Point-in-Time Restore (M2+ clusters only)

1. Atlas dashboard → your cluster → **Backup**
2. Select **Restore** → **Point in Time**
3. Choose a timestamp before the bad deploy
4. Restore to a new cluster first — **never restore over production directly**
5. Verify data integrity on the new cluster
6. Update `MONGODB_URI` in Railway to point to the restored cluster
7. Trigger backend redeploy

### M0 Free Tier (No PITR)

Atlas M0 does not include point-in-time restore. Manual options:

- Restore from the last manual `mongodump` snapshot (see Backup section below)
- If no snapshot, the data loss window is since the last backup

### Setting Up Regular Backups (Recommended)

Add this to your Railway backend as a cron job or run via Railway:

```bash
# Run daily; store output in a secure S3 / GCS bucket
mongodump --uri="$MONGODB_URI" --out="backup-$(date +%Y%m%d)"
```

---

## Redis Rollback (Upstash)

Redis stores:
- Short-lived JWT refresh tokens (30-day TTL)
- Email confirmation tokens (24h TTL)
- Password reset tokens (1h TTL)
- Account lockout counters (15-min TTL)

**Redis data does not need rollback** — all data is transient. If Upstash is unavailable:

1. Users cannot log in with refresh tokens (they must re-authenticate)
2. In-flight email confirmation links will be invalidated
3. Account lockouts will be cleared (beneficial, not harmful)

**Recovery action:** Simply ensure the backend is reconnected to Upstash. No data restore needed.

---

## Environment Variable Recovery

If a bad env var was deployed (e.g., wrong `JWT_SECRET`):

1. Railway dashboard → your service → **Variables**
2. Update the variable to the correct value
3. Railway will automatically trigger a redeploy with the new value

> Keep a copy of all production env vars in a password manager or a secrets manager (Vault, AWS Secrets Manager, etc.). Never store them only in Railway — if the Railway project is deleted, the vars are gone.

---

## Communication Checklist During Incident

- [ ] Post in team Slack/WhatsApp: "Rollback in progress — ETA 5 minutes"
- [ ] If users are affected: post status update on any public status page
- [ ] Once stable: write a brief post-mortem (what failed, why, fix)
- [ ] Update deployment checklist with the new safeguard

---

## Backup Contacts

| Service | Support URL | SLA |
|---|---|---|
| MongoDB Atlas | support.mongodb.com | Varies by tier |
| Upstash | upstash.com/docs/support | Community / Pro |
| Railway | railway.app/help | Community / Pro |
| Vercel | vercel.com/support | Community / Pro |
| Paystack | paystack.com/support | Business hours (WAT) |
| OpenAI | platform.openai.com/support | Varies |

---

## Rollback Time Targets

| Service | Target RTO | Method |
|---|---|---|
| Backend (Railway) | < 3 minutes | Redeploy previous build |
| AI service (Railway) | < 3 minutes | Redeploy previous build |
| Frontend (Vercel) | < 2 minutes | Promote previous deployment |
| Database (Atlas M2+) | < 30 minutes | Point-in-time restore to new cluster |
| Database (Atlas M0) | Manual | Restore from last mongodump |
