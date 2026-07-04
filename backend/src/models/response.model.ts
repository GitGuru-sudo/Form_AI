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
  // NOT required: a respondent may legitimately leave an optional question blank.
  // Mongoose treats "" as failing `required`, which previously made the whole
  // response (including personal info) fail to save with a 500.
  answerText: { type: String, default: '' }
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

// Responses are always queried/sorted by form + recency (getResponses, export,
// and the dashboard aggregate). This compound index serves all of them.
ResponseSchema.index({ formId: 1, submittedAt: -1 });

export default mongoose.model<IResponse>('Response', ResponseSchema);
