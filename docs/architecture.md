# SmartEd Africa — Architecture

## System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                      SmartEd Africa Platform                    │
├──────────────────┬──────────────────────┬──────────────────────┤
│   Frontend       │   Backend API        │   AI Service         │
│   React 19       │   Node.js / Express  │   Python / FastAPI   │
│   Vite + TW v4   │   MongoDB + Redis    │   OpenAI GPT-4o-mini │
│   Zustand        │   JWT Auth           │   SSE Streaming      │
│   PWA / SW       │   Paystack Payments  │   Session Context    │
└──────────────────┴──────────────────────┴──────────────────────┘
         │                    │                      │
         └────────────────────┴──────────────────────┘
                     Docker / Docker Compose
                     GitHub Actions CI/CD
```

---

## Frontend Architecture

**Stack:** Vite 7, React 19, TypeScript, TailwindCSS v4, Zustand, PWA (vite-plugin-pwa)

### Navigation Pattern
The app uses **custom state-based routing** (not React Router) via `App.tsx` `currentPage` state. Special deep-link pages (`/confirm/:token`, `/reset-password/:token`) are detected from `window.location.pathname` on mount.

### State Management
- `useAuthStore` (Zustand + persist middleware) — authentication state, access token, user profile
- Local component state for UI (modals, forms, chat)
- No global server state cache yet (future: React Query or SWR)

### Key Pages
| Page | Route Pattern | Description |
|------|--------------|-------------|
| LandingPage | `/` (default) | Marketing + hero section |
| CoursesPage | state: courses | Course marketplace |
| SubscriptionPage | state: subscription | Subscription plans |
| CheckoutPage | state: checkout | Payment via Paystack |
| StudentDashboard | state: StudentDashboard | Main student UI (fetches real API) |
| ConfirmEmailPage | `/confirm/:token` | Email verification deep-link |
| ResetPasswordPage | `/reset-password/:token` | Password reset deep-link |

### PWA / Offline Support
- Service Worker registered via `vite-plugin-pwa` (Workbox)
- Cache strategies: NetworkFirst for API, CacheFirst for images/fonts, NetworkOnly for AI
- App shell pre-cached
- `site.webmanifest` with all icons

---

## Backend Architecture

**Stack:** Node.js 22 ESM, Express 4, MongoDB (Mongoose 7), Redis (ioredis 5), JWT, Paystack

### Layer Pattern
```
Request → Middleware Stack → Router → Controller → Service → Model → DB
```

### Middleware Stack (in order)
1. `helmet` — security headers (CSP in production)
2. `cors` — CORS policy
3. `express.json` / `express.urlencoded` — body parsing
4. `cookie-parser` — cookie parsing
5. `express-mongo-sanitize` — NoSQL injection protection
6. `hpp` — HTTP parameter pollution prevention
7. Request ID attachment (UUID per request)
8. `morgan` — HTTP access logging
9. `apiLimiter` — global 200 req/15min rate limit (Redis-backed)
10. Route-specific `authLimiter` — 10 req/15min on auth endpoints

### Authentication System
Two-token flow:
1. **Access Token** — short-lived JWT (15 min), signed with `JWT_SECRET`, carries `{ id, role }`
2. **Refresh Token** — 128-char hex, stored in Redis as `refresh:<token> → userId` (30-day TTL)

Single-use tokens (stored in Redis):
- `emailConfirm:<token> → userId` (24h TTL)
- `passwordReset:<token> → userId` (1h TTL)

**Brute-force protection:** 5 failed attempts → 30-minute account lock.

### Key Services
| Service | Purpose |
|---------|---------|
| `tokenService.js` | JWT generation + Redis refresh token management |
| `authTokenService.js` | Single-use tokens (email confirm, password reset) |
| `paymentService.js` | Paystack integration with MongoDB transactions |
| `emailService.js` | Nodemailer (SMTP) transactional emails |
| `storageService.js` | Image upload (stub — needs S3/Cloudinary integration) |
| `courseService.js` | Course CRUD + isPublished filtering |
| `quizService.js` | Quiz creation, scoring, attempt persistence |

### Data Models
| Model | Key Fields |
|-------|-----------|
| User | name, email, password(hashed), role, confirmed, loginAttempts, lockUntil, enrolledCourses[] |
| Course | title, description, level, language, examType, price, isPublished, enrollmentCount |
| Lesson | title, content, videoUrl, duration, course, order, isOfflineAvailable |
| Quiz | title, lesson, examType, timeLimitMinutes, questions[], attempts[] |
| Enrollment | student, course, status(pending/active/cancelled), amount, provider |
| Progress | student, course, lesson, completedAt |

### Payment Flow
```
Student → POST /payments/initialize
       ← { paymentUrl, reference }

Student visits paymentUrl (Paystack)
Paystack → GET /payments/verify/:reference
         ← enrollment.status = 'active'
         ← user.enrolledCourses += course (atomic MongoDB transaction)

Paystack → POST /payments/webhook (backup, HMAC-SHA512 verified)
```

---

## AI Service Architecture

**Stack:** Python 3.11, FastAPI, AsyncOpenAI, slowapi (rate limiting)

### Session Management
- In-memory `SessionStore` with 30-min TTL per session
- Conversation history trimmed to last 20 turns
- Sessions cleared on chat close (DELETE /session/:id)

### Streaming
Server-Sent Events (SSE) via `StreamingResponse`. Each token is streamed as:
```json
{"token": "...", "session_id": "..."}
```
Followed by a final `{"done": true, "session_id": "..."}` event.

### Safety
- Prompt injection detection (pattern matching on 12 known patterns)
- Content constrained to WAEC/JAMB/NECO/GCE/NCE curriculum
- Rate limit: 30 requests/minute per IP
- Max input: 2000 characters

---

## Infrastructure

### Docker Services
- `frontend` — nginx serving Vite build
- `backend` — Node.js server
- `ai-service` — uvicorn FastAPI server
- `mongodb` — MongoDB 7 with auth
- `redis` — Redis 7 with password

### CI/CD (GitHub Actions)
- `backend/.github/workflows/ci.yml` — lint, test, build (Redis 7 + MongoDB service)
- `frontend/.github/workflows/ci.yml` — tsc, lint, vite build

### Environment Configuration
All configuration flows through `backend/src/config/env.js`. Required vars in production:
`MONGO_URI`, `JWT_SECRET`, `REFRESH_SECRET`, `REDIS_HOST`/`REDIS_PORT`, `SMTP_*`, `PAYSTACK_SECRET_KEY`, `FRONTEND_URL`

Frontend requires: `VITE_API_URL`, `VITE_AI_URL`
AI service requires: `OPENAI_API_KEY`
