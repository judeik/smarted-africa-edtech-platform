import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMyEnrollments, completeLesson, getMyStats } from '../controllers/enrollmentController.js';

const router = Router();

router.get('/me', protect, getMyEnrollments);
router.get('/stats', protect, getMyStats);
router.post('/:courseId/lessons/:lessonId/complete', protect, completeLesson);

export default router;
