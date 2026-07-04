import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  format?: 'email' | 'phone';
}

export interface IQuestion {
  questionId: string;
  questionText: string;
  questionType: string;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
  validation?: IQuestionValidation;
}

export interface IForm extends Document {
  clerkUserId: string;
  title: string;
  description?: string;
  shareToken: string;
  isActive: boolean;
  collectFullName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  collectAge: boolean;
  collectDateOfBirth: boolean;
  collectGender: boolean;
  notifyOnResponse: boolean;
  notifyEmail?: string;
  questions: IQuestion[];
  theme?: {
    accent?: string;
    coverImageUrl?: string;
    logoUrl?: string;
    mode?: 'light' | 'dark';
  };
  createdAt: Date;
  updatedAt: Date;
}

const ValidationSchema = new Schema({
  minLength: { type: Number },
  maxLength: { type: Number },
  min: { type: Number },
  max: { type: Number },
  pattern: { type: String },
  patternMessage: { type: String },
  format: { type: String, enum: ['email', 'phone'] }
}, { _id: false });

const QuestionSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  questionType: { type: String, required: true },
  options: [{ type: String }],
  isRequired: { type: Boolean, default: false },
  orderIndex: { type: Number, required: true },
  validation: { type: ValidationSchema, default: undefined }
});

const FormSchema: Schema = new Schema({
  clerkUserId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  shareToken: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  collectFullName: { type: Boolean, default: false },
  collectEmail: { type: Boolean, default: false },
  collectPhone: { type: Boolean, default: false },
  collectAge: { type: Boolean, default: false },
  collectDateOfBirth: { type: Boolean, default: false },
  collectGender: { type: Boolean, default: false },
  notifyOnResponse: { type: Boolean, default: false },
  notifyEmail: { type: String },
  questions: [QuestionSchema],
  theme: {
    type: new Schema({
      accent: { type: String },
      coverImageUrl: { type: String },
      logoUrl: { type: String },
      mode: { type: String, enum: ['light', 'dark'] }
    }, { _id: false }),
    default: undefined
  },
}, { timestamps: true });

// Dashboard lists a user's forms newest-first; public form lookups hit shareToken
// (already indexed via `unique: true`).
FormSchema.index({ clerkUserId: 1, createdAt: -1 });

export default mongoose.model<IForm>('Form', FormSchema);
