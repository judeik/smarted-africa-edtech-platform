# SmartEd Africa — Production Readiness Audit Report

**Date:** 2026-06-06  
**Auditor:** Principal Software Architect (Claude Code)  
**Scope:** Full codebase — `frontend/`, `backend/`, `AI-ML/`, `docker-compose.yml`, CI/CD workflows

---

## Executive Summary

SmartEd Africa has a solid architectural foundation: a well-structured Node.js/Express backend with JWT + Redis auth, a React 19 + Zustand frontend, and a FastAPI AI tutor wrapper. However, several critical runtime blockers prevent the app from starting, and dozens of production-quality gaps exist across security, testing, data layer, and UX flows. This report catalogues every issue found.

---

## CRITICAL — App Cannot Start or Core Flow Is Broken

| # | Location | Issue | Impact |
|---|----------|-------|--------|
| C1 | `backend/package.json` | `cors`, `morgan`, `express-rate-limit` are imported in `app.js` / `rateLimiter.js` but **absent from `dependencies`**. Server crashes on startup. | Server will not start |
| C2 | `frontend/package.json` | `zustand` is used in `authStore.ts` but **missing from `dependencies`**. Frontend build fails. | Frontend build fails |
| C3 | `backend/src/services/paymentService.js:45` | References `env.paystackSecret` but `env.js` exports `env.paystackSecretKey`. All payment initializations silently send `undefined` as the API key → 401 from Paystack. | Payments broken |
| C4 | `backend/src/app.js:38-41` | Legacy `/api` redirect does `req.url = req.url` (no-op) then passes `router` directly as middleware without a prefix — creates a duplicate route tree shadowing errors. | Routing issues |
| C5 | `frontend/src/components/auth/AuthModal.tsx:319-331` | Signup "confirm-sent" step asks users to manually **paste a User ID** from the confirmation page, but no confirmation page exists in the frontend. The `/confirm/:token` deep-link resolves to the landing page (404 UX). Users cannot complete signup. | Signup 100% broken |
| C6 | `frontend/src/components/auth/AuthModal.tsx:106` | `authApi.register(signupEmail.split('@')[0], signupEmail)` derives name from email prefix. Backend schema requires name (min 2 chars), so `a@b.com` → name `"a"` fails validation. | Some registrations fail |

---

## HIGH PRIORITY — Security, Data Integrity, Major UX Gaps

| # | Location | Issue | Recommendation |
|---|----------|-------|----------------|
| H1 | `backend/` | **No NoSQL injection protection**: no `express-mongo-sanitize`. A `{ "$gt": "" }` attack on login email could bypass auth. | Add `express-mongo-sanitize` |
| H2 | `backend/` | **No HTTP Parameter Pollution (HPP)** protection. | Add `hpp` middleware |
| H3 | `backend/src/middleware/authMiddleware.js` | `protect` calls `User.findById()` on every authenticated request with no caching — extra DB round-trip per request. | Cache in Redis or trust JWT claims |
| H4 | `backend/src/models/Enrollment.js:21` | Unique index has `sparse: true` on `{student, course}`. Sparse indexes skip null values, allowing multiple null-student enrollments and breaking data integrity. | Remove `sparse: true` |
| H5 | `backend/src/services/paymentService.js` | `verifyPayment` updates enrollment and user sequentially with no transaction. A crash between writes leaves inconsistent state. | Use MongoDB multi-document transaction |
| H6 | `frontend/` | **No email confirmation page** — `/confirm/:token` deep-link has no SPA handler. | Add URL-param handling on mount |
| H7 | `frontend/` | **No password reset page** — `/reset-password/:token` deep-link has no SPA handler. | Add URL-param token detection on mount |
| H8 | `backend/.github/workflows/ci.yml` | CI pipeline **spins up Redis but not MongoDB**. `auth.test.js` contains only sanity checks (1+1=2), not real tests. | Add MongoDB service, write real tests |
| H9 | `frontend/src/pages/StudentDashboard.tsx` | **100% mock data** — courses, assignments, notifications are all hardcoded arrays. No API calls. | Wire to enrollment/progress APIs |
| H10 | `backend/src/utils/logger.js` | Logger is console wrappers with no timestamps, request IDs, or log levels. Not suitable for production log aggregation. | Use `pino` structured logger |
| H11 | `AI-ML/openai_api.py` | AI endpoint has **no CORS**, no auth, no rate limiting. Anyone can call it and exhaust OpenAI quota. | Add `fastapi-limiter`, CORS, bearer auth |
| H12 | `AI-ML/openai_api.py` | **No conversation context/session**. Every message is stateless. Language primer fires a silent background call that the AI immediately forgets. | Session-based conversation history |
| H13 | `backend/src/config/env.js` | `jwtSecret` uses `required()` but falls back to `'dev_jwt_secret_CHANGE_IN_PRODUCTION'` via `||`. The fallback masks missing vars in non-production. | Remove fallback string |
| H14 | `frontend/src/pages/LandingPage.tsx:52` | Newsletter subscription logs email to console, never calls any API. | Wire to real endpoint or remove |
| H15 | `backend/src/routes/courseRoutes.js` | `listCourses` does not filter by `isPublished: true`. Draft courses visible to all users. | Add `isPublished` filter for non-admin |

---

## MEDIUM PRIORITY — Code Quality, Performance, UX

| # | Location | Issue |
|---|----------|-------|
| M1 | `frontend/src/components/` | Duplicate components: `forms/CaptchaComponent.jsx` + `auth/CaptchaComponent.tsx`; `forms/PasswordStrength.jsx` + `auth/PasswordStrength.tsx`; `forms/InputField.jsx` + `auth/AuthInputField.tsx`. Dead JSX files in a TypeScript project. |
| M2 | `frontend/src/pages/LandingPage.tsx` | Interface declares only `currentLanguage` and `onAuthClick` but `App.tsx` also passes `onNavigateToCourses`. TypeScript error. |
| M3 | `backend/src/models/User.js` | `emailToken`, `resetToken`, `resetTokenExp`, `refreshToken` fields exist but are completely unused — tokens live in Redis. Wastes storage, creates confusion. |
| M4 | `backend/src/middleware/rateLimiter.js` | Rate limiter uses default in-memory store. In multi-instance deployments, limits are per-process, not global. | Use `rate-limit-redis` |
| M5 | `frontend/public/site.webmanifest` | PWA manifest and icons exist but **no service worker** is registered. Offline-first is a core feature claim. |
| M6 | `backend/src/controllers/courseController.js:93` | `updateCourse` passes `req.body` directly to `findByIdAndUpdate` — mass-assignment risk. | Whitelist allowed fields |
| M7 | `AI-ML/openai_api.py` | GET endpoint at `/` accepts queries via URL params — logged by proxies, leaking student questions. | Remove GET endpoint |
| M8 | `backend/src/services/authService.js` | File exists but is empty (no exports). Confusing dead file. |
| M9 | `backend/src/services/storageService.js` | `uploadImage` is a stub with no real storage provider (S3/GCS/Cloudinary). Course image uploads silently produce undefined URLs. |
| M10 | `frontend/` | `react-router-dom` v7 installed but never used. Adds ~50KB to bundle needlessly. |
| M11 | `backend/` | `authorize` middleware defined in both `authMiddleware.js` and `authorize.js` with slightly different implementations. |
| M12 | `frontend/src/pages/StudentDashboard.tsx` | Tab content for `progress`, `community`, `ai-tutor`, `achievements`, `messages`, `settings` renders nothing. Blank screen on navigation. |

---

## LOW PRIORITY — Polish, Optimization, Docs

| # | Location | Issue |
|---|----------|-------|
| L1 | `frontend/` | No dark mode despite being listed as a requirement. |
| L2 | `frontend/` | No code splitting/lazy loading. All pages bundle together. |
| L3 | `backend/` | No OpenAPI/Swagger documentation. |
| L4 | `frontend/` | No Sentry or top-level React error boundary. An unhandled error crashes the entire UI. |
| L5 | `backend/` | No Sentry integration. Production errors go untracked. |
| L6 | `backend/src/controllers/quizController.js` | `createQuiz` has no auth check. Anyone can create quizzes. |
| L7 | `AI-ML/` | No `GET /health` endpoint. Docker compose health check calls `GET /` which executes a real AI query. |
| L8 | `frontend/` | `AuthModal` has `CaptchaComponent` in the codebase but it's never wired up to the login/register forms. |
| L9 | `backend/` | No database migration history or seed scripts for course content. |
| L10 | `backend/docker/` | Dockerfile `build` stage has no purpose (no TypeScript compile step for plain JS). |

---

## Dependency Inventory

### Backend — Missing from `package.json`
```
cors                    (used in app.js — CRITICAL)
morgan                  (used in app.js — CRITICAL)
express-rate-limit      (used in rateLimiter.js — CRITICAL)
express-mongo-sanitize  (needed for NoSQL injection protection)
hpp                     (needed for HTTP param pollution)
```

### Frontend — Missing from `package.json`
```
zustand  (used in authStore.ts — CRITICAL)
```

### Frontend — Unused in `package.json`
```
react-router-dom  (installed v7, zero usage in codebase — ~50KB dead weight)
```

---

## Compliance Checklist

| Area | Status |
|------|--------|
| Auth (JWT + refresh token rotation) | ✅ Implemented |
| Email verification | ⚠️ Backend OK, frontend handler missing |
| Password reset | ⚠️ Backend OK, frontend handler missing |
| Brute-force protection | ✅ 5 attempts, 30 min lock |
| Rate limiting | ⚠️ Missing dep, in-memory only |
| HTTPS enforcement | ❌ Relies on reverse proxy only |
| Input validation (Zod) | ✅ Auth routes validated |
| NoSQL injection protection | ❌ Missing |
| XSS protection | ⚠️ Helmet present, CSP disabled |
| CSRF protection | ❌ Missing |
| RBAC | ✅ user/teacher/admin roles |
| Payment (Paystack) | ⚠️ Env var bug, no transactions |
| Offline-first PWA | ❌ Manifest only, no service worker |
| Multilingual (8 languages) | ✅ translations.ts |
| Tests | ❌ Placeholder sanity checks only |
| CI/CD | ⚠️ Backend CI exists, no MongoDB |
| Docker | ✅ Dockerfiles + compose |
| Structured logging | ❌ console.log wrappers only |
| Error tracking (Sentry) | ❌ Not integrated |
| API documentation | ❌ Not generated |
