export type QuestionType =
  | "short_answer"
  | "long_answer"
  | "multiple_choice"
  | "checkbox"
  | "dropdown"
  | "rating"
  | "linear_scale"
  | "date"
  | "time"
  | "number"
  | "email"
  | "phone"
  | "yes_no"
  | "file_upload";

export interface Question {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
}

export interface Form {
  _id?: string;
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
  questions: Question[];
  responseCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Answer {
  questionId: string;
  questionText: string;
  answerText: string;
}

export interface FormResponse {
  _id?: string;
  formId: string;
  respondentName?: string;
  respondentEmail?: string;
  respondentPhone?: string;
  respondentAge?: number;
  respondentDOB?: string;
  respondentGender?: string;
  answers: Answer[];
  submittedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  isTyping?: boolean;
}
