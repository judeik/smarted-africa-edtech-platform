import { ZodError } from 'zod';
import { fail } from '../utils/response.js';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({ body: req.body, query: req.query, params: req.params });
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map((e) => `${e.path.slice(1).join('.')}: ${e.message}`);
      return fail(res, 'Validation failed', messages, 400);
    }
    next(err);
  }
};
