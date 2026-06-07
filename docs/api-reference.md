# SmartEd Africa — API Reference

**Base URL (production):** `https://api.smarted.africa/api/v1`  
**Base URL (local):** `http://localhost:5000/api/v1`  
**AI Service (local):** `http://localhost:8001`

All endpoints return JSON with the shape:
```json
{ "success": true|false, "message": "...", "data": { ... } }
```

Authentication is via `Authorization: Bearer <accessToken>` header.  
Refresh token is stored as an `httpOnly` cookie named `refreshToken`.

---

## Authentication

### POST /auth/register
Register a new user. Sends a confirmation email.
```json
{ "name": "Ada Obi", "email": "ada@example.com" }
```
**Responses:** `201` Created | `400` Validation | `409` Email already confirmed

---

### GET /auth/confirm/:token
Confirm email address from the link in the confirmation email.
**Response:** `200` `{ userId }` — use to call `/auth/set-password/:id`

---

### POST /auth/set-password/:id
Set a password after email confirmation.
```json
{ "password": "Test@1234", "confirmPassword": "Test@1234" }
```
**Response:** `200` `{ user, accessToken }` — sets `refreshToken` cookie

---

### POST /auth/login
```json
{ "email": "ada@example.com", "password": "Test@1234" }
```
**Response:** `200` `{ user, accessToken }` — sets `refreshToken` cookie  
**Errors:** `401` Invalid credentials | `403` Email not confirmed | `429` Account locked

---

### POST /auth/refresh
Rotate refresh token. Reads `refreshToken` cookie, returns new access token.
**Response:** `200` `{ accessToken }`

---

### POST /auth/logout
Revoke refresh token.
**Response:** `200` OK — clears `refreshToken` cookie

---

### POST /auth/forgot-password
```json
{ "email": "ada@example.com" }
```
**Response:** `200` OK (always, to prevent enumeration)

---

### POST /auth/reset-password/:token
```json
{ "password": "NewPass@1234", "confirmPassword": "NewPass@1234" }
```
**Response:** `200` OK

---

### POST /auth/resend-confirmation
```json
{ "email": "ada@example.com" }
```
**Response:** `200` OK

---

### GET /auth/me
**Auth required.**  
Returns the authenticated user's profile.
**Response:** `200` `{ user: { id, name, email, role } }`

---

## Courses

### GET /courses
List published courses (paginated).
```
?page=1&limit=10&level=beginner&language=en&examType=WAEC
```
**Response:** `200` `{ data: { items, total, page, limit } }`

---

### GET /courses/:id
Get a single course by ID.
**Response:** `200` `{ data: { course } }`

---

### POST /courses
**Auth required. Role: teacher or admin.**
```json
{
  "title": "WAEC Maths Mastery",
  "description": "...",
  "level": "intermediate",
  "language": "en",
  "price": 5000,
  "examType": "WAEC"
}
```
Accepts `multipart/form-data` with optional `image` field (file upload).

---

### PUT /courses/:id
**Auth required. Role: teacher (own) or admin.**  
Same body as POST. Whitelisted fields: `title, description, level, language, price, examType, isPublished`.

---

### DELETE /courses/:id
**Auth required. Role: teacher (own) or admin.**

---

## Lessons

All lesson routes are nested under `/courses/:courseId/lessons`.

### GET /courses/:courseId/lessons
List all lessons for a course.

### GET /courses/:courseId/lessons/:id
Get a single lesson.

### POST /courses/:courseId/lessons
**Auth required. Role: teacher or admin.**
```json
{ "title": "Intro to Algebra", "content": "...", "order": 1, "isOfflineAvailable": true }
```

---

## Enrollments

### GET /enrollments/me
**Auth required.**  
Returns all active enrollments with progress data.
**Response:**
```json
{
  "data": {
    "enrollments": [
      {
        "enrollmentId": "...",
        "course": { "_id": "...", "title": "...", "examType": "WAEC" },
        "progress": 75,
        "completedLessons": 30,
        "totalLessons": 40,
        "nextLesson": { "id": "...", "title": "Wave Optics" }
      }
    ]
  }
}
```

### GET /enrollments/stats
**Auth required.**  
Returns aggregate stats for the dashboard.
**Response:**
```json
{
  "data": { "activeEnrollments": 3, "completedLessons": 45, "totalLessons": 120, "overallProgress": 37 }
}
```

### POST /enrollments/:courseId/lessons/:lessonId/complete
**Auth required.**  
Mark a lesson as completed. Requires active enrollment.

---

## Quizzes

### GET /quizzes/:id
Get a quiz by ID.

### POST /quizzes
**Auth required. Role: teacher or admin.**
```json
{
  "title": "Week 1 Quiz",
  "lesson": "<lessonId>",
  "examType": "WAEC",
  "timeLimitMinutes": 30,
  "questions": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctIndex": 1,
      "explanation": "2 + 2 = 4"
    }
  ]
}
```

### POST /quizzes/:id/submit
**Auth required.**
```json
{ "answers": [1, 2, 0] }
```
**Response:** `200` `{ data: { result: { score, total, correct, results } } }`

---

## Payments

### POST /payments/initialize
**Auth required.**
```json
{ "courseId": "<id>", "amount": 5000 }
```
**Response:** `200` `{ data: { paymentUrl, reference, enrollmentId } }`

### GET /payments/verify/:reference
Verify a Paystack transaction. Called after redirect.

### POST /payments/webhook
Paystack webhook endpoint. Validates HMAC-SHA512 signature.

---

## AI Service (port 8001)

### GET /health
Health check.

### POST /ask
```json
{
  "text": "Explain photosynthesis",
  "session_id": "optional-uuid",
  "language": "en",
  "stream": true
}
```
**Response (stream=true):** Server-Sent Events stream  
```
data: {"token": "Photo...", "session_id": "uuid"}
data: {"token": "synthesis...", "session_id": "uuid"}
data: {"done": true, "session_id": "uuid"}
```
**Response (stream=false):** `200` `{ answer: "...", session_id: "..." }`

### DELETE /session/:sessionId
Clear conversation history for a session.

---

## Health Check

### GET /api/health (no version prefix)
```json
{ "status": "ok", "env": "production", "timestamp": "2026-06-06T..." }
```
