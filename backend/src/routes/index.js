// backend/src/routes/index.js

// ----------------------------
// Import Modules
// ----------------------------
import express from 'express';
import authRoutes from './authRoutes.js';
import courseRoutes from './courseRoutes.js';
import lessonRoutes from './lessonRoutes.js';
import quizRoutes from './quizRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import enrollmentRoutes from './enrollmentRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import adminRoutes from './adminRoutes.js';
import aiRoutes from './aiRoutes.js';

// ----------------------------
// Initialize Router
// ----------------------------
const router = express.Router();

// ----------------------------
// Health Check Route
// ----------------------------
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ----------------------------
// Mount Feature Routes
// ----------------------------
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/courses/:courseId/lessons', lessonRoutes);
router.use('/quizzes', quizRoutes);
router.use('/payments', paymentRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);

// ----------------------------
// Export Router
// ----------------------------
export default router;
