# SmartEd Africa — Product Roadmap

## Current Status (v1.0 — Production Ready)

### Completed ✅
- AI Tutor with streaming SSE + conversation memory (8 languages)
- Full auth system: register → email confirm → set password → login → refresh → logout
- Password reset via email
- Brute-force protection + account lockout
- Course marketplace (WAEC/JAMB/NECO/GCE/NCE)
- Course enrollment + Paystack payment integration
- Student dashboard with real progress tracking
- PWA with offline caching (Workbox)
- Quiz/CBT engine (scoring, explanations, attempts)
- Role-based access (student/teacher/admin)
- Multilingual UI (8 languages)
- Docker + docker-compose production deployment
- GitHub Actions CI/CD

---

## Q3 2026 — Growth Features

### Core Learning
- [ ] CBT engine UI with countdown timer and auto-submit
- [ ] 1000+ past WAEC/JAMB questions seeded in database
- [ ] Video lesson player (YouTube/Cloudinary embed)
- [ ] Lesson notes and bookmark system
- [ ] Downloadable PDF study materials

### Gamification
- [ ] XP system (earn points for completing lessons/quizzes)
- [ ] Level progression (Novice → Scholar → Expert → Master)
- [ ] Daily streak tracking
- [ ] Badges and achievements
- [ ] National leaderboard by exam type

### Payments
- [ ] Subscription plans: Monthly (₦2,000) / Yearly (₦18,000)
- [ ] Paystack subscription auto-renewal
- [ ] Discount coupons system
- [ ] Referral program (earn credit for referrals)

---

## Q4 2026 — Community + Scale

### Community
- [ ] Study groups (create/join by exam type or subject)
- [ ] Peer messaging within groups
- [ ] Teacher/tutor profiles and Q&A boards

### Admin
- [ ] Admin dashboard (content management, user analytics)
- [ ] Course creation wizard for teachers
- [ ] Question bank import (bulk upload CSV)

### Infrastructure
- [ ] CDN for static assets (Cloudflare)
- [ ] S3 image storage
- [ ] MongoDB replica set
- [ ] Sentry error tracking

---

## 2027 — Expansion

- [ ] Mobile apps (React Native, sharing web codebase)
- [ ] Multi-tenant mode for schools (school admin dashboards)
- [ ] Offline lesson download with IndexedDB sync
- [ ] AI-powered adaptive learning (personalized question difficulty)
- [ ] Certificate generation (PDF) on course completion
- [ ] Government partnerships (WAEC/JAMB official content)
- [ ] East Africa expansion (Uganda, Kenya, Tanzania)

---

## Technical Debt Queue

| Item | Sprint |
|------|--------|
| storageService S3 integration | Q3 W1 |
| Sentry error tracking | Q3 W1 |
| CSRF protection | Q3 W2 |
| Admin dashboard | Q3 W3-4 |
| AI session Redis migration | Q3 W3 |
| Remove duplicate JSX components | Q3 W1 |
| React Error Boundary | Q3 W1 |
