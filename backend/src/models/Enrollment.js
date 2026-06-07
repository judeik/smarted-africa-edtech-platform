import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'active', 'cancelled'],
      default: 'pending',
    },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'NGN' },
    provider: { type: String },
    providerPaymentId: { type: String },
  },
  { timestamps: true }
);

// One enrollment record per student per course
EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model('Enrollment', EnrollmentSchema);
