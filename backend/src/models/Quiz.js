import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const AttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [Number], required: true },
    score: { type: Number, required: true },
    correct: { type: Number, required: true },
    total: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const QuizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    examType: {
      type: String,
      enum: ['WAEC', 'JAMB', 'NECO', 'GCE', 'NCE', 'General'],
      default: 'General',
    },
    timeLimitMinutes: { type: Number, default: 0 }, // 0 = untimed
    questions: { type: [QuestionSchema], default: [] },
    attempts: { type: [AttemptSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Quiz', QuizSchema);
