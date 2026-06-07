import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import Quiz from '../models/Quiz.js';
import { success, notFound, fail } from '../utils/response.js';
import { info } from '../utils/logger.js';

// GET /admin/users
export const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 25));
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const role = req.query.role;

    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    if (role) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return success(res, { users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// PATCH /admin/users/:id
export const updateUser = async (req, res, next) => {
  try {
    const allowed = ['role', 'confirmed'];
    const updates = {};
    for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return notFound(res, 'User not found');
    info(`[admin] User ${req.params.id} updated by ${req.user._id}: ${JSON.stringify(updates)}`);
    return success(res, { user });
  } catch (err) { next(err); }
};

// DELETE /admin/users/:id  (soft-disable by locking account)
export const disableUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) return fail(res, 'Cannot disable yourself', null, 400);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { lockUntil: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), loginAttempts: 999 },
      { new: true }
    ).select('-password');
    if (!user) return notFound(res, 'User not found');
    info(`[admin] User ${req.params.id} disabled by ${req.user._id}`);
    return success(res, { user }, 'User disabled');
  } catch (err) { next(err); }
};

// POST /admin/courses  (publish/unpublish)
export const toggleCoursePublish = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return notFound(res, 'Course not found');
    course.isPublished = !course.isPublished;
    await course.save();
    info(`[admin] Course ${req.params.id} ${course.isPublished ? 'published' : 'unpublished'} by ${req.user._id}`);
    return success(res, { course });
  } catch (err) { next(err); }
};

// GET /admin/courses
export const listAllCourses = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Number(req.query.limit || 20));
    const [courses, total] = await Promise.all([
      Course.find().populate('author', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Course.countDocuments(),
    ]);
    return success(res, { courses, total, page });
  } catch (err) { next(err); }
};

// GET /admin/stats
export const getSystemStats = async (req, res, next) => {
  try {
    const [
      totalUsers, confirmedUsers, totalCourses, publishedCourses,
      totalEnrollments, activeEnrollments, totalProgress, totalQuizAttempts,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ confirmed: true }),
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: 'active' }),
      Progress.countDocuments(),
      Quiz.aggregate([{ $project: { count: { $size: '$attempts' } } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
    ]);

    const totalRevenue = await Enrollment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return success(res, {
      users: { total: totalUsers, confirmed: confirmedUsers },
      courses: { total: totalCourses, published: publishedCourses },
      enrollments: { total: totalEnrollments, active: activeEnrollments },
      learning: { lessonsCompleted: totalProgress, quizAttempts: totalQuizAttempts[0]?.total || 0 },
      revenue: { totalNgn: totalRevenue[0]?.total || 0 },
    });
  } catch (err) { next(err); }
};
