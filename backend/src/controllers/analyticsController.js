import mongoose from 'mongoose';
import AIUsage from '../models/AIUsage.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import Quiz from '../models/Quiz.js';
import { success } from '../utils/response.js';

const GPT4O_MINI_INPUT_COST = 0.15 / 1_000_000;   // per token
const GPT4O_MINI_OUTPUT_COST = 0.60 / 1_000_000;

// POST /api/v1/analytics/ai-usage — called by AI service after each completion
export const recordAIUsage = async (req, res, next) => {
  try {
    const { sessionId, userId, language, promptTokens, completionTokens, model } = req.body;
    const totalTokens = (promptTokens || 0) + (completionTokens || 0);
    const estimatedCostUsd =
      (promptTokens || 0) * GPT4O_MINI_INPUT_COST +
      (completionTokens || 0) * GPT4O_MINI_OUTPUT_COST;

    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    await AIUsage.create({
      user: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      sessionId,
      language: language || 'en',
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      totalTokens,
      estimatedCostUsd,
      model: model || 'gpt-4o-mini',
      month,
    });

    return success(res, { totalTokens, estimatedCostUsd }, 'Usage recorded');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/ai-usage/summary — admin only
export const getAIUsageSummary = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalStats, languageBreakdown, dailyUsage, topUsers] = await Promise.all([
      AIUsage.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            totalTokens: { $sum: '$totalTokens' },
            totalCostUsd: { $sum: '$estimatedCostUsd' },
          },
        },
      ]),
      AIUsage.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$language', requests: { $sum: 1 }, tokens: { $sum: '$totalTokens' } } },
        { $sort: { requests: -1 } },
      ]),
      AIUsage.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            requests: { $sum: 1 },
            tokens: { $sum: '$totalTokens' },
            cost: { $sum: '$estimatedCostUsd' },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      AIUsage.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, user: { $exists: true, $ne: null } } },
        { $group: { _id: '$user', requests: { $sum: 1 }, tokens: { $sum: '$totalTokens' } } },
        { $sort: { tokens: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
        { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$userInfo.name', email: '$userInfo.email', requests: 1, tokens: 1 } },
      ]),
    ]);

    return success(res, {
      summary: totalStats[0] || { totalRequests: 0, totalTokens: 0, totalCostUsd: 0 },
      languageBreakdown,
      dailyUsage,
      topUsers,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/student — student's own analytics
export const getStudentAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [enrollments, recentProgress, quizAttempts, aiUsage] = await Promise.all([
      Enrollment.find({ student: userId, status: 'active' }).populate('course', 'title examType').lean(),
      Progress.find({ student: userId }).sort({ completedAt: -1 }).limit(30).populate('lesson', 'title').lean(),
      Quiz.aggregate([
        { $unwind: '$attempts' },
        { $match: { 'attempts.user': new mongoose.Types.ObjectId(userId) } },
        { $sort: { 'attempts.completedAt': -1 } },
        { $limit: 20 },
        { $project: { title: 1, examType: 1, score: '$attempts.score', completedAt: '$attempts.completedAt' } },
      ]),
      AIUsage.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sessions: { $sum: 1 },
            tokens: { $sum: '$totalTokens' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]),
    ]);

    // Weekly study time (lessons completed per day for past 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyActivity = await Progress.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(userId), completedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          lessonsCompleted: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Average quiz scores by exam type
    const scoresByExam = await Quiz.aggregate([
      { $unwind: '$attempts' },
      { $match: { 'attempts.user': new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$examType',
          avgScore: { $avg: '$attempts.score' },
          attempts: { $sum: 1 },
          bestScore: { $max: '$attempts.score' },
        },
      },
    ]);

    return success(res, {
      enrollments: enrollments.length,
      recentProgress,
      quizAttempts,
      aiUsage: aiUsage.reverse(),
      weeklyActivity,
      scoresByExam,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/admin/overview — admin overview
export const getAdminOverview = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [userStats, enrollmentStats, revenueStats, newUsersDaily] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            confirmed: { $sum: { $cond: ['$confirmed', 1, 0] } },
          },
        },
      ]),
      Enrollment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, '$amount', 0] } },
          },
        },
      ]),
      Enrollment.aggregate([
        { $match: { status: 'active', createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
            enrollments: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            newUsers: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return success(res, { userStats, enrollmentStats, revenueStats, newUsersDaily });
  } catch (err) {
    next(err);
  }
};
