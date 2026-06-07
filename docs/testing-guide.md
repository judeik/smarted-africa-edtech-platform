# SmartEd Africa — Testing Guide

## Backend Tests

**Stack:** Jest 29, babel-jest (ESM→CJS transform), mongodb-memory-server, supertest

### Run tests
```bash
cd backend
NODE_ENV=test node node_modules/jest/bin/jest.js --config=jest.config.cjs --runInBand
```

Or via npm script (after updating package.json `test` script):
```bash
cd backend
npm test
```

### Test structure
```
backend/tests/
├── auth.test.js         # Auth API integration tests
└── (future)
    ├── courses.test.js
    ├── payments.test.js
    └── quizzes.test.js
```

### What's tested
| Test Suite | Coverage |
|------------|---------|
| GET /api/health | Health endpoint |
| POST /auth/register | Happy path, validation, duplicate email, resend |
| POST /auth/login | Success, wrong password, unknown email, unconfirmed, lockout |
| GET /auth/me | Auth required, valid token |
| POST /auth/forgot-password | Enumeration prevention, valid user |
| GET /courses | Empty list, published-only filter |
| POST /quizzes/:id/submit | Auth required, correct scoring |

### Mocking strategy
- **ioredis** — `__mocks__/ioredis.js` — in-memory Map-based mock
- **nodemailer** — `__mocks__/nodemailer.js` — jest.fn() transport mock
- **MongoDB** — `mongodb-memory-server` — real in-memory MongoDB

### Jest configuration
See `backend/jest.config.cjs`. Key settings:
- `transform: { '^.+\\.js$': 'babel-jest' }` — converts ESM to CJS
- `moduleNameMapper` — maps `bson` and `zod` to compatible versions
- `transformIgnorePatterns` — transforms ESM-only pino packages
- `testTimeout: 60000` — MongoDB memory server needs time on first run

---

## Frontend Linting and Type Checking

```bash
cd frontend
npm run lint          # ESLint
npm run build         # TypeScript + Vite build (catches type errors)
```

---

## Manual Testing Checklist

### Auth flow
- [ ] Register with name + email → confirmation email received
- [ ] Click confirmation link → ConfirmEmailPage shown → redirected to set-password
- [ ] Set password → auto-login → dashboard shown
- [ ] Logout → landing page
- [ ] Login → dashboard shown
- [ ] 5 bad logins → account locked message
- [ ] Forgot password → email received → reset password → can login

### Course browsing
- [ ] Courses page loads, shows only published courses
- [ ] Filter by exam type and language works
- [ ] Subscribe flow → Paystack checkout opens

### AI Tutor
- [ ] Chat opens
- [ ] Questions stream word-by-word
- [ ] Language change affects AI response language
- [ ] Clearing history starts fresh

### Dashboard
- [ ] Enrolled courses load from API
- [ ] Progress bars show correct percentages
- [ ] Refresh button reloads data
- [ ] "No courses yet" empty state shown when unenrolled

### Offline / PWA
- [ ] App installs as PWA on mobile
- [ ] Static assets load without network
- [ ] API calls fail gracefully offline

---

## Adding New Tests

```js
// backend/tests/courses.test.js
import Course from '../src/models/Course.js';

describe('GET /api/v1/courses', () => {
  it('filters by examType', async () => {
    const author = await User.create({ ... });
    await Course.create({ examType: 'WAEC', isPublished: true, author: author._id, title: 'WAEC' });
    await Course.create({ examType: 'JAMB', isPublished: true, author: author._id, title: 'JAMB' });

    const res = await request.get('/api/v1/courses?examType=WAEC');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].title).toBe('WAEC');
  });
});
```

Follow the pattern in `auth.test.js`:
1. Start MongoMemoryServer in `beforeAll`
2. Clean collections in `afterEach`
3. Stop server in `afterAll`
4. Mock ioredis and nodemailer
