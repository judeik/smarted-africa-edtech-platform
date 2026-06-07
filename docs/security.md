# SmartEd Africa — Security Guide

## Authentication Security

| Control | Implementation |
|---------|---------------|
| Password hashing | bcryptjs, 12 salt rounds |
| Access tokens | JWT HS256, 15-minute lifetime |
| Refresh tokens | 128-char random hex, Redis-backed, rotated on every use |
| Email verification | Random hex token, 24h TTL, Redis-backed |
| Password reset | Random hex token, 1h TTL, Redis-backed |
| Brute-force protection | 5 failed logins → 30-minute account lock |
| User enumeration prevention | Forgot-password always returns 200 |

## Transport Security

- All cookies set with `httpOnly: true`, `secure: true` (production), `sameSite: 'Strict'`
- `helmet` middleware enables `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- CSP enabled in production mode
- CORS restricted to `CORS_ORIGIN` env var

## Input Security

| Attack | Mitigation |
|--------|-----------|
| SQL/NoSQL injection | `express-mongo-sanitize` strips `$` and `.` from input |
| HTTP Parameter Pollution | `hpp` middleware |
| XSS | Helmet headers + React's built-in escaping |
| Mass assignment | Explicit field whitelisting in updateCourse |
| CSRF | `sameSite: 'Strict'` cookies + separate refresh endpoint |

## API Security

- Rate limiting: 200 req/15min globally, 10 req/15min on auth endpoints (Redis-backed)
- AI service: 30 req/min per IP
- Input validation: Zod schemas on all auth routes
- Request size limit: 10MB
- Request IDs for audit trail

## AI Service Security

- Prompt injection detection: 12 known injection patterns blocked
- Input truncated at 2000 characters
- Responses constrained to WAEC/JAMB/NECO/GCE/NCE curriculum
- No PII stored in conversation history (in-memory only, 30-min TTL)
- GET endpoint removed (query strings logged by proxies)

## Payment Security

- Paystack webhook validated with HMAC-SHA512 signature
- Enrollment + user update wrapped in MongoDB multi-document transaction
- Idempotent payment verification (re-calling on already-active enrollment is safe)

## Secrets Management

- All secrets via environment variables, never committed to git
- `.env` files in `.gitignore`
- `JWT_SECRET` and `REDIS_PASSWORD` required in production (app exits if missing)
- Separate secrets for JWT access tokens and Redis

## Known Gaps / Roadmap

| Gap | Priority | Plan |
|-----|----------|------|
| No CSRF token on state-changing requests | Medium | Add `csurf` or double-submit cookie |
| storageService is a stub | High | Integrate S3 or Cloudinary |
| No Sentry error tracking | Medium | Add `@sentry/node` |
| No audit log for admin actions | Low | Add audit middleware |
| AI session history in-memory | Low | Migrate to Redis for multi-instance |
| Password history (prevent reuse) | Low | Track hashed past passwords |
