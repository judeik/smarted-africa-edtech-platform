import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import env from '../config/env.js';

const PAYSTACK_BASE = 'https://api.paystack.co';

export async function initializePayment({ studentId, courseId, amount, email }) {
  // Upsert: if a pending enrollment exists, reuse it; otherwise create
  const enrollment = await Enrollment.findOneAndUpdate(
    { student: studentId, course: courseId },
    {
      $setOnInsert: {
        student: studentId,
        course: courseId,
        amount,
        currency: 'NGN',
        provider: 'paystack',
        status: 'pending',
      },
    },
    { upsert: true, new: true }
  );

  const res = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      amount: Math.round(amount * 100), // kobo
      email,
      metadata: { enrollmentId: enrollment._id.toString() },
    },
    { headers: { Authorization: `Bearer ${env.paystackSecretKey}` } }
  );

  const { authorization_url, reference } = res.data.data;
  return { enrollmentId: enrollment._id, paymentUrl: authorization_url, reference };
}

export async function verifyPayment(reference) {
  const res = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${reference}`,
    { headers: { Authorization: `Bearer ${env.paystackSecretKey}` } }
  );

  const data = res.data.data;
  const enrollmentId = data.metadata?.enrollmentId;
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) throw Object.assign(new Error('Enrollment not found'), { status: 404 });

  // Idempotent: if already active, just return
  if (enrollment.status === 'active') return enrollment;

  if (data.status !== 'success') {
    enrollment.status = 'cancelled';
    await enrollment.save();
    return enrollment;
  }

  // Use a MongoDB transaction to guarantee both writes succeed or both fail
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      enrollment.status = 'active';
      enrollment.providerPaymentId = data.reference;
      await enrollment.save({ session });

      await User.findByIdAndUpdate(
        enrollment.student,
        { $addToSet: { enrolledCourses: enrollment.course } },
        { session }
      );

      await Course.findByIdAndUpdate(
        enrollment.course,
        { $inc: { enrollmentCount: 1 } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  return enrollment;
}

export async function handleWebhook(headers, body) {
  const signature = headers['x-paystack-signature'];
  const computed = crypto
    .createHmac('sha512', env.paystackSecretKey)
    .update(JSON.stringify(body))
    .digest('hex');

  if (signature !== computed) throw Object.assign(new Error('Invalid webhook signature'), { status: 400 });

  if (body.event === 'charge.success') {
    return verifyPayment(body.data.reference);
  }
  return null;
}
