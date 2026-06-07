import { z } from 'zod';

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(2000).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    language: z.string().length(2).optional(),
    price: z.coerce.number().min(0).optional(),
    examType: z.enum(['WAEC', 'JAMB', 'NECO', 'GCE', 'NCE', 'General']).optional(),
  }),
});

export const listCoursesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    language: z.string().optional(),
    examType: z.enum(['WAEC', 'JAMB', 'NECO', 'GCE', 'NCE', 'General']).optional(),
    search: z.string().max(200).optional(),
  }),
});

export const createLessonSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    content: z.string().optional(),
    videoUrl: z.string().url().optional().or(z.literal('')),
    order: z.coerce.number().int().min(0).optional(),
  }),
  params: z.object({ courseId: z.string().length(24) }),
});

export const createQuizSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    lesson: z.string().length(24, 'Invalid lesson ID'),
    questions: z.array(
      z.object({
        question: z.string().min(5),
        options: z.array(z.string().min(1)).min(2).max(6),
        correctIndex: z.number().int().min(0),
        explanation: z.string().optional(),
      })
    ).min(1),
  }),
});

export const submitQuizSchema = z.object({
  body: z.object({
    answers: z.array(z.number().int().min(0)),
    userId: z.string().length(24).optional(),
  }),
  params: z.object({ id: z.string().length(24) }),
});

export const initPaymentSchema = z.object({
  body: z.object({
    courseId: z.string().length(24, 'Invalid course ID'),
    amount: z.coerce.number().positive('Amount must be positive'),
  }),
});
