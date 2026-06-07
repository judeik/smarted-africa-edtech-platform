import mongoose from 'mongoose';

const ProgressSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ProgressSchema.index({ student: 1, course: 1, lesson: 1 }, { unique: true });
ProgressSchema.index({ student: 1, course: 1 });

export default mongoose.model('Progress', ProgressSchema);
