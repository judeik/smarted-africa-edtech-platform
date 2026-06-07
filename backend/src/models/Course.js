import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    language: { type: String, default: 'en', index: true },
    image: { type: String },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    price: { type: Number, default: 0 },
    examType: {
      type: String,
      enum: ['WAEC', 'JAMB', 'NECO', 'GCE', 'NCE', 'General'],
      default: 'General',
      index: true,
    },
    isPublished: { type: Boolean, default: false },
    enrollmentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CourseSchema.index({ title: 'text', description: 'text' });
CourseSchema.index({ level: 1, language: 1, examType: 1 });

export default mongoose.model('Course', CourseSchema);
