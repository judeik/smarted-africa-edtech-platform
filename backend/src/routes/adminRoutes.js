import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorize.js';
import {
  listUsers, updateUser, disableUser,
  toggleCoursePublish, listAllCourses, getSystemStats,
} from '../controllers/adminController.js';

const router = Router();
const adminOnly = [protect, authorize('admin')];

router.get('/stats', ...adminOnly, getSystemStats);
router.get('/users', ...adminOnly, listUsers);
router.patch('/users/:id', ...adminOnly, updateUser);
router.delete('/users/:id', ...adminOnly, disableUser);
router.get('/courses', ...adminOnly, listAllCourses);
router.patch('/courses/:id/publish', ...adminOnly, toggleCoursePublish);

export default router;
