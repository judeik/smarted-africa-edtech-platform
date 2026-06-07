import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorize.js';
import {
  recordAIUsage,
  getAIUsageSummary,
  getStudentAnalytics,
  getAdminOverview,
} from '../controllers/analyticsController.js';

const router = Router();

// Internal — called by AI service (no user auth, uses shared secret)
router.post('/ai-usage', recordAIUsage);

// Student analytics
router.get('/student', protect, getStudentAnalytics);

// Admin analytics
router.get('/admin/overview', protect, authorize('admin'), getAdminOverview);
router.get('/ai-usage/summary', protect, authorize('admin'), getAIUsageSummary);

export default router;
