// backend/src/controllers/courseController.js

// ----------------------------
// Import Services & Utilities
// ----------------------------
import * as courseService from '../services/courseService.js';
import { uploadImage } from '../services/storageService.js';
import { created, success, notFound, forbidden } from '../utils/response.js';

// ----------------------------
// Create a New Course
// ----------------------------
export const createCourse = async (req, res, next) => {
  try {
    const { title, description, level, language } = req.body;
    const authorId = req.user._id; // Get user ID from authenticated user
    let imageUrl;

    // If file uploaded, store it and get URL
    if (req.file) {
      const result = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
      imageUrl = result.url;
    }

    // Create course in database
    const course = await courseService.createCourse({
      title,
      description,
      level,
      language,
      image: imageUrl,
      author: authorId
    });

    return created(res, { course }, 'Course created');
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Get Single Course by ID
// ----------------------------
export const getCourse = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    if (!course) return notFound(res, 'Course not found');

    return success(res, { course }, 'Course fetched');
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// List Courses with Pagination & Filters
// ----------------------------
export const listCourses = async (req, res, next) => {
  try {
    const q = {
      page: Number(req.query.page || 1),
      limit: Math.min(Number(req.query.limit || 10), 50),
      level: req.query.level,
      language: req.query.language,
      examType: req.query.examType,
      isAdmin: req.user?.role === 'admin',
    };

    const data = await courseService.listCourses(q);
    return success(res, data, 'Courses listed');
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Update Course
// ----------------------------
export const updateCourse = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    if (!course) return notFound(res, 'Course not found');

    // Only admin or course author can update
    if (req.user.role !== 'admin' && course.author.toString() !== req.user._id.toString()) {
      return forbidden(res, 'Forbidden to update this course');
    }

    const allowedFields = ['title', 'description', 'level', 'language', 'price', 'examType', 'isPublished'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (req.file) {
      const result = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
      updates.image = result.url;
    }

    const updated = await courseService.updateCourse(req.params.id, updates);
    return success(res, { course: updated }, 'Course updated');
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Delete Course
// ----------------------------
export const deleteCourse = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    if (!course) return notFound(res, 'Course not found');

    // Only admin or course author can delete
    if (req.user.role !== 'admin' && course.author.toString() !== req.user._id.toString()) {
      return forbidden(res, 'Forbidden to delete this course');
    }

    await courseService.deleteCourse(req.params.id);
    return success(res, null, 'Course deleted');
  } catch (err) {
    next(err);
  }
};
