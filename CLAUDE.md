# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartEd Africa is a mobile-first learning platform for African students (Codefest Hack 2025, Nigeria) with AI tutoring for WAEC/JAMB/GCE/NCE exam prep, offline-first lessons for IDP camps, and multilingual support (English, Yoruba, Hausa, Igbo, French, Portuguese, Swahili, Amharic).

Three independent sub-projects live in the monorepo:
- `frontend/` — Vite + React 19 + TypeScript + TailwindCSS v4
- `backend/` — Node.js (ESM) + Express + MongoDB + Redis
- `AI-ML/` — Python + FastAPI + OpenAI API

---

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run preview    # preview production build
```

### Backend (`cd backend`)
```bash
npm run dev        # nodemon server.js
npm start          # node server.js
npm test           # jest --runInBand (runs all tests sequentially)
```
Run a single test file:
```bash
npx jest tests/auth.test.js --runInBand
```

### AI-ML (`cd AI-ML`)
```bash
pip install -r requirements.txt
uvicorn openai_api:app --reload   # runs on port 8001
```

---

## Architecture

### Frontend

Navigation is **custom state-based**, not React Router `<Routes>`. `App.tsx` holds a `currentPage` state (`'landing' | 'courses' | 'subscription' | 'checkout' | 'payment-success' | 'StudentDashboard'`) and conditionally renders page components. All navigation happens by calling `setCurrentPage`.

**Auth is currently mocked.** `handleAuthSuccess` stores a literal `'mock_jwt_token'` in `localStorage` and populates a hardcoded user object — the real backend is not yet wired to the frontend. The `checkAuthStatus` function similarly returns a mock user on any token present.

Language strings live in `src/utils/translations.ts` as a flat keyed object per locale. All user-facing text should be looked up from there via the `currentLanguage` prop.

### Backend

Uses a **controller → service → model** layered pattern:
- `src/controllers/` — thin request/response handlers, call services
- `src/services/` — business logic, call models
- `src/models/` — Mongoose schemas
- `src/routes/` — Express routers; all mounted under `/api` via `src/routes/index.js`

**Two-layer token system:**
- **Access tokens** — short-lived JWT (15 min default), signed with `JWT_SECRET`, carry `{ id, role }`
- **Refresh tokens** — random 128-char hex strings, stored in Redis as `refresh:<token> → userId` (30-day TTL)
- **Single-use tokens** (email confirm, password reset) — stored in Redis as `emailConfirm:<token> → userId` and `passwordReset:<token> → userId` with explicit TTLs (24h / 1h)

All Redis keys are managed in `src/services/authTokenService.js` (single-use) and `src/services/tokenService.js` (refresh).

**Auth flow:** Register → unconfirmed user created → email confirmation token saved to Redis → user confirms → `confirmed: true` → can log in. Login is blocked if `confirmed` is false.

**Payment:** Paystack only (NGN). Flow: `initializePayment` creates a pending `Enrollment` doc → redirects to Paystack → `verifyPayment` checks Paystack and flips enrollment to `active`. Webhook support exists in `paymentService.js` with HMAC-SHA512 signature verification.

**All config** flows through `src/config/env.js`, which centralizes `process.env` reads with defaults.

Required env vars: `MONGO_URI`, `JWT_SECRET`, `REDIS_HOST`/`REDIS_PORT`, `SMTP_*`/`EMAIL_FROM`, `PAYSTACK_SECRET_KEY`, `FRONTEND_URL`.

### AI-ML

A minimal FastAPI wrapper around `gpt-4o-mini`. System prompts constrain responses to WAEC/JAMB/GCE/NCE curriculum and instruct the model to use the language specified in the user's first message. Runs separately on port 8001.

---

## Key Constraints

- Backend requires **Node.js ≥ 22** and uses ESM (`"type": "module"`) — always use `import`/`export`, never `require`.
- CI (`backend/.github/workflows/ci.yml`) spins up a Redis 7 service container before running tests.
- `User.password` has `select: false` — must use `.select('+password')` explicitly when comparing passwords.
- The `authorize` middleware in `src/middleware/authMiddleware.js` is role-based; current roles are `user` and `admin`.
