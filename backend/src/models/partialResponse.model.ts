import mongoose, { Schema, Document } from 'mongoose';

export interface IPartialResponse extends Document {
  formId: mongoose.Types.ObjectId;
  sessionId: string;
  answeredCount: number;
  lastQuestionReached: string;
  lastQuestionText: string;
  updatedAt: Date;
  createdAt: Date;
}

const PartialResponseSchema: Schema = new Schema({
  formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
  sessionId: { type: String, required: true },
  answeredCount: { type: Number, default: 0 },
  lastQuestionReached: { type: String, default: '' },
  lastQuestionText: { type: String, default: '' },
}, { timestamps: true });

PartialResponseSchema.index({ formId: 1, sessionId: 1 }, { unique: true });
PartialResponseSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export default mongoose.model<IPartialResponse>('PartialResponse', PartialResponseSchema);
