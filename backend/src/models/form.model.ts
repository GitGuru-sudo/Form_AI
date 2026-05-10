import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  questionId: string;
  questionText: string;
  questionType: string;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
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
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  questionType: { type: String, required: true },
  options: [{ type: String }],
  isRequired: { type: Boolean, default: false },
  orderIndex: { type: Number, required: true }
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
  questions: [QuestionSchema],
}, { timestamps: true });

export default mongoose.model<IForm>('Form', FormSchema);
