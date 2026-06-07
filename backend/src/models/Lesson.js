import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    videoUrl: { type: String },
    duration: { type: Number, default: 0 }, // seconds
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    order: { type: Number, default: 0 },
    isOfflineAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LessonSchema.index({ course: 1, order: 1 });

export default mongoose.model('Lesson', LessonSchema);
