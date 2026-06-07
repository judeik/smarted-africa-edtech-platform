import { error as logError } from '../utils/logger.js';
import { serverError, fail } from '../utils/response.js';

export const notFound = (_req, res) => {
  res.status(404).json({ success: false, message: 'Not Found' });
};

export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logError('ErrorHandler:', err.stack || err);

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    return fail(res, `Duplicate value for: ${field}`, { field, keyValue: err.keyValue }, 409);
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return fail(res, 'Validation failed', messages, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return fail(res, 'Invalid token', null, 401);
  }
  if (err.name === 'TokenExpiredError') {
    return fail(res, 'Token expired', null, 401);
  }

  if (status >= 500) return serverError(res, message);
  return fail(res, message, err.errors || null, status);
};
