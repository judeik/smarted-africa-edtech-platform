import * as quizService from '../services/quizService.js';
import { created, success, notFound } from '../utils/response.js';

export const createQuiz = async (req, res, next) => {
  try {
    const quiz = await quizService.createQuiz(req.body);
    return created(res, { quiz }, 'Quiz created');
  } catch (err) {
    next(err);
  }
};

export const getQuiz = async (req, res, next) => {
  try {
    const quiz = await quizService.getQuizById(req.params.id);
    if (!quiz) return notFound(res, 'Quiz not found');
    return success(res, { quiz }, 'Quiz fetched');
  } catch (err) {
    next(err);
  }
};

export const submitQuiz = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const result = await quizService.submitQuiz(req.params.id, req.body.answers || [], userId);
    if (!result) return notFound(res, 'Quiz not found');
    return success(res, { result }, 'Quiz submitted');
  } catch (err) {
    next(err);
  }
};
