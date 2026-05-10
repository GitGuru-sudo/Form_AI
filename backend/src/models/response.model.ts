import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer {
  questionId: string;
  questionText: string;
  answerText: string;
}

export interface IResponse extends Document {
  formId: mongoose.Types.ObjectId;
  respondentName?: string;
  respondentEmail?: string;
  respondentPhone?: string;
  respondentAge?: number;
  respondentDOB?: Date;
  respondentGender?: string;
  answers: IAnswer[];
  submittedAt: Date;
}

const AnswerSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  answerText: { type: String, required: true }
});

const ResponseSchema: Schema = new Schema({
  formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
  respondentName: { type: String },
  respondentEmail: { type: String },
  respondentPhone: { type: String },
  respondentAge: { type: Number },
  respondentDOB: { type: Date },
  respondentGender: { type: String },
  answers: [AnswerSchema],
  submittedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IResponse>('Response', ResponseSchema);
