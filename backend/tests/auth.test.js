/**
 * Auth API Integration Tests
 * Uses mongodb-memory-server to run against a real (in-memory) MongoDB instance.
 * Redis and nodemailer are mocked via moduleNameMapper in jest.config.cjs.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import Lesson from '../src/models/Lesson.js';
import Quiz from '../src/models/Quiz.js';

let mongod;
let request;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'test' });
  request = supertest(app);
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// ── Health check ─────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── Registration ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns 201', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      name: 'Ada Obi',
      email: 'ada@test.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/registration successful/i);
  });

  it('returns 400 for missing name', async () => {
    const res = await request.post('/api/v1/auth/register').send({ email: 'noname@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request.post('/api/v1/auth/register').send({ name: 'Test User', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('resends confirmation if email already registered but unconfirmed', async () => {
    await request.post('/api/v1/auth/register').send({ name: 'Repeat User', email: 'repeat@test.com' });
    const res = await request.post('/api/v1/auth/register').send({ name: 'Repeat User', email: 'repeat@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/resent/i);
  });

  it('returns 409 if email already confirmed', async () => {
    await request.post('/api/v1/auth/register').send({ name: 'Confirmed', email: 'confirmed@test.com' });
    await User.findOneAndUpdate({ email: 'confirmed@test.com' }, { confirmed: true });
    const res = await request.post('/api/v1/auth/register').send({ name: 'Confirmed', email: 'confirmed@test.com' });
    expect(res.status).toBe(409);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    const user = new User({ name: 'Test Student', email: 'student@test.com', confirmed: true, password: 'Test@1234' });
    await user.save();
  });

  it('logs in successfully with correct credentials', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: 'student@test.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe('student@test.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: 'student@test.com',
      password: 'WrongPass@1',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request.post('/api/v1/auth/login').send({ email: 'ghost@test.com', password: 'Password@1' });
    expect(res.status).toBe(401);
  });

  it('returns 403 if email not confirmed', async () => {
    const u = new User({ name: 'Unconfirmed', email: 'unconfirmed@test.com', confirmed: false });
    await u.save();
    const res = await request.post('/api/v1/auth/login').send({
      email: 'unconfirmed@test.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for missing password', async () => {
    const res = await request.post('/api/v1/auth/login').send({ email: 'student@test.com' });
    expect(res.status).toBe(400);
  });

  it('locks account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request.post('/api/v1/auth/login').send({ email: 'student@test.com', password: 'BadPass@1' });
    }
    const res = await request.post('/api/v1/auth/login').send({
      email: 'student@test.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/locked/i);
  });
});

// ── Protected route ───────────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user info with valid token', async () => {
    const user = new User({ name: 'Me User', email: 'me@test.com', confirmed: true, password: 'Test@1234' });
    await user.save();

    const loginRes = await request.post('/api/v1/auth/login').send({ email: 'me@test.com', password: 'Test@1234' });
    const token = loginRes.body.accessToken;

    const res = await request.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
  });
});

// ── Forgot password ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/forgot-password', () => {
  it('always returns 200 to prevent user enumeration', async () => {
    const res = await request.post('/api/v1/auth/forgot-password').send({ email: 'nobody@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('sends reset email for valid confirmed user', async () => {
    await User.create({ name: 'Reset User', email: 'reset@test.com', confirmed: true });
    const res = await request.post('/api/v1/auth/forgot-password').send({ email: 'reset@test.com' });
    expect(res.status).toBe(200);
  });
});

// ── Courses ─────────────────────────────────────────────────────────────────

describe('GET /api/v1/courses', () => {
  it('returns empty list when no published courses', async () => {
    const res = await request.get('/api/v1/courses');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('only returns published courses to anonymous users', async () => {
    const author = await User.create({ name: 'Teacher', email: 'teacher@test.com', role: 'teacher', confirmed: true });
    await Course.create({ title: 'Published Course', author: author._id, isPublished: true, examType: 'WAEC' });
    await Course.create({ title: 'Draft Course', author: author._id, isPublished: false, examType: 'JAMB' });

    const res = await request.get('/api/v1/courses');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].title).toBe('Published Course');
  });
});

// ── Quiz submission ───────────────────────────────────────────────────────────

describe('POST /api/v1/quizzes/:id/submit', () => {
  it('returns 401 for unauthenticated submission', async () => {
    const res = await request
      .post('/api/v1/quizzes/000000000000000000000001/submit')
      .send({ answers: [0] });
    expect(res.status).toBe(401);
  });

  it('scores quiz correctly', async () => {
    const teacher = await User.create({ name: 'T', email: 't@test.com', role: 'teacher', confirmed: true });
    const course = await Course.create({ title: 'Test Course', author: teacher._id, isPublished: true });
    const lesson = await Lesson.create({ title: 'Lesson 1', course: course._id });
    const quiz = await Quiz.create({
      title: 'Quiz 1',
      lesson: lesson._id,
      questions: [
        { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
        { question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 2 },
      ],
    });

    const student = new User({ name: 'S', email: 's@test.com', confirmed: true, password: 'Test@1234' });
    await student.save();

    const loginRes = await request.post('/api/v1/auth/login').send({ email: 's@test.com', password: 'Test@1234' });
    const token = loginRes.body.accessToken;

    const res = await request
      .post(`/api/v1/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [0, 2] });

    expect(res.status).toBe(200);
    expect(res.body.data.result.score).toBe(100);
    expect(res.body.data.result.correct).toBe(2);
  });
});
