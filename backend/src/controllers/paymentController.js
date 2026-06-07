import * as paymentService from '../services/paymentService.js';
import { success, fail, serverError } from '../utils/response.js';

export const initPayment = async (req, res, next) => {
  try {
    const { courseId, amount } = req.body;
    const session = await paymentService.initializePayment({
      studentId: req.user._id,
      courseId,
      amount,
      email: req.user.email,
    });
    return success(res, session, 'Payment session created');
  } catch (err) {
    next(err);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.body;
    const enrollment = await paymentService.verifyPayment(reference);
    return success(res, enrollment, 'Payment verified');
  } catch (err) {
    next(err);
  }
};

export const webhook = async (req, res, next) => {
  try {
    await paymentService.handleWebhook(req.headers, req.body);
    return res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
};
