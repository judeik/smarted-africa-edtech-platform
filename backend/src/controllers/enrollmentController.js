import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import Lesson from '../models/Lesson.js';
import { success, notFound } from '../utils/response.js';

// GET /api/v1/enrollments/me — list authenticated user's active enrollments with progress
export const getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.user._id,
      status: 'active',
    })
      .populate('course', 'title description image examType level price')
      .sort({ updatedAt: -1 });

    // For each enrollment, compute lesson progress
    const results = await Promise.all(
      enrollments.map(async (enrollment) => {
        const courseId = enrollment.course._id;

        const [totalLessons, completedLessons] = await Promise.all([
          Lesson.countDocuments({ course: courseId }),
          Progress.countDocuments({ student: req.user._id, course: courseId }),
        ]);

        const progressPct = totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

        // Find the next unfinished lesson
        const completedIds = await Progress.find(
          { student: req.user._id, course: courseId },
          'lesson'
        ).lean();
        const completedSet = new Set(completedIds.map((p) => p.lesson.toString()));
        const nextLesson = await Lesson.findOne({
          course: courseId,
          _id: { $nin: [...completedSet] },
        }).sort({ order: 1 });

        return {
          enrollmentId: enrollment._id,
          course: enrollment.course,
          progress: progressPct,
          completedLessons,
          totalLessons,
          nextLesson: nextLesson ? { id: nextLesson._id, title: nextLesson.title } : null,
          enrolledAt: enrollment.createdAt,
        };
      })
    );

    return success(res, { enrollments: results }, 'Enrollments fetched');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/enrollments/:courseId/lessons/:lessonId/complete — mark lesson complete
export const completeLesson = async (req, res, next) => {
  try {
    const { courseId, lessonId } = req.params;

    // Verify the student has an active enrollment for this course
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      status: 'active',
    });
    if (!enrollment) return notFound(res, 'Enrollment not found or not active');

    // Verify lesson belongs to this course
    const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
    if (!lesson) return notFound(res, 'Lesson not found');

    // Upsert progress record
    await Progress.findOneAndUpdate(
      { student: req.user._id, course: courseId, lesson: lessonId },
      { completedAt: new Date() },
      { upsert: true }
    );

    return success(res, null, 'Lesson marked as complete');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/enrollments/stats — dashboard stats for authenticated user
export const getMyStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [activeEnrollments, completedLessons] = await Promise.all([
      Enrollment.countDocuments({ student: userId, status: 'active' }),
      Progress.countDocuments({ student: userId }),
    ]);

    // Overall progress across all enrolled courses
    const enrollments = await Enrollment.find({ student: userId, status: 'active' }, 'course');
    const courseIds = enrollments.map((e) => e.course);

    const totalLessons = await Lesson.countDocuments({ course: { $in: courseIds } });
    const overallProgress = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    return success(res, {
      activeEnrollments,
      completedLessons,
      totalLessons,
      overallProgress,
    }, 'Stats fetched');
  } catch (err) {
    next(err);
  }
};
