import mongoose from 'mongoose';

const AIUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, index: true },
    language: { type: String, default: 'en' },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    // GPT-4o-mini pricing as of 2024: $0.15/1M input, $0.60/1M output
    estimatedCostUsd: { type: Number, default: 0 },
    model: { type: String, default: 'gpt-4o-mini' },
    subject: { type: String }, // detected subject area (Math, Physics, etc.)
    month: { type: String, index: true }, // YYYY-MM for monthly aggregation
  },
  { timestamps: true }
);

AIUsageSchema.index({ user: 1, month: 1 });
AIUsageSchema.index({ createdAt: -1 });

export default mongoose.model('AIUsage', AIUsageSchema);
