import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../lib/logger';

dotenv.config();

const HUGGINGFACE_API_URL = process.env.HUGGINGFACE_API_URL || '';
const HUGGINGFACE_API_PATH = process.env.HUGGINGFACE_API_PATH || '/generate';
const REQUEST_TIMEOUT = Number(process.env.HUGGINGFACE_TIMEOUT_MS || 105000);

function buildPrompt(prompt: string, questionCount: number): string {
  return `You are FormAI, an assistant that generates form definitions.

Create a form with exactly ${questionCount} questions based on the following request:

${prompt}

Respond ONLY with valid JSON in this exact format:
{
  "title": "Form title",
  "description": "Brief description",
  "questions": [
    {
      "questionId": "q1",
      "questionText": "Question text here",
      "questionType": "short_answer|long_answer|multiple_choice|checkbox|dropdown|rating|date|number|email|phone|yes_no",
      "isRequired": true|false,
      "orderIndex": 0,
      "options": ["option1", "option2"]|null
    }
  ]
}

Return only the JSON object and no extra text.`;
}

const QUESTION_TYPES = [
  "short_answer", "long_answer", "multiple_choice", "checkbox",
  "dropdown", "rating", "date", "number", "email", "phone", "yes_no"
];

const QUESTION_TEMPLATES = {
  job: [
    { text: "Full Name", type: "short_answer", required: true },
    { text: "Email Address", type: "email", required: true },
    { text: "Phone Number", type: "phone", required: false },
    { text: "Position Applying For", type: "short_answer", required: true },
    { text: "Years of Experience", type: "number", required: true },
    { text: "Current Company", type: "short_answer", required: false },
    { text: "LinkedIn Profile", type: "short_answer", required: false },
    { text: "Why do you want to join us?", type: "long_answer", required: true },
    { text: "Your Resume/CV", type: "file_upload", required: false },
    { text: "Earliest Start Date", type: "date", required: false }
  ],
  feedback: [
    { text: "Your Name", type: "short_answer", required: false },
    { text: "Email Address", type: "email", required: false },
    { text: "How would you rate our service?", type: "rating", required: true },
    { text: "What did you like most?", type: "long_answer", required: false },
    { text: "What can we improve?", type: "long_answer", required: false },
    { text: "Would you recommend us?", type: "yes_no", required: true },
    { text: "Additional Comments", type: "long_answer", required: false }
  ],
  event: [
    { text: "Full Name", type: "short_answer", required: true },
    { text: "Email Address", type: "email", required: true },
    { text: "Phone Number", type: "phone", required: false },
    { text: "Number of Attendees", type: "number", required: true },
    { text: "Dietary Requirements", type: "multiple_choice", required: false, options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"] },
    { text: "Special Accommodations", type: "long_answer", required: false }
  ],
  contact: [
    { text: "Full Name", type: "short_answer", required: true },
    { text: "Email Address", type: "email", required: true },
    { text: "Phone Number", type: "phone", required: false },
    { text: "Subject", type: "short_answer", required: true },
    { text: "Your Message", type: "long_answer", required: true },
    { text: "Preferred Contact Method", type: "dropdown", required: false, options: ["Email", "Phone", "Either"] }
  ],
  survey: [
    { text: "Your Name", type: "short_answer", required: false },
    { text: "Email Address", type: "email", required: false },
    { text: "Age Range", type: "dropdown", required: false, options: ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] },
    { text: "How often do you use our service?", type: "dropdown", required: true, options: ["Daily", "Weekly", "Monthly", "Rarely", "First time"] },
    { text: "Overall Satisfaction", type: "rating", required: true },
    { text: "What improvements would you like?", type: "long_answer", required: false },
    { text: "Would you recommend us?", type: "yes_no", required: true }
  ],
  order: [
    { text: "Full Name", type: "short_answer", required: true },
    { text: "Email Address", type: "email", required: true },
    { text: "Phone Number", type: "phone", required: true },
    { text: "Shipping Address", type: "long_answer", required: true },
    { text: "Product Selection", type: "multiple_choice", required: true, options: ["Product A", "Product B", "Product C"] },
    { text: "Quantity", type: "number", required: true },
    { text: "Special Instructions", type: "long_answer", required: false }
  ]
};

function getCategory(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('job') || p.includes('apply') || p.includes('career') || p.includes('hire') || p.includes('resume')) return 'job';
  if (p.includes('feedback') || p.includes('review') || p.includes('rate') || p.includes('testimonial')) return 'feedback';
  if (p.includes('event') || p.includes('register') || p.includes('rsvp') || p.includes('conference') || p.includes('workshop')) return 'event';
  if (p.includes('contact') || p.includes('inquiry') || p.includes('question') || p.includes('reach')) return 'contact';
  if (p.includes('survey') || p.includes('questionnaire') || p.includes('poll')) return 'survey';
  if (p.includes('order') || p.includes('purchase') || p.includes('buy') || p.includes('shop')) return 'order';
  return 'contact';
}

function createFallback(prompt: string, questionCount: number = 10) {
  const category = getCategory(prompt);
  const templates = QUESTION_TEMPLATES[category as keyof typeof QUESTION_TEMPLATES] || QUESTION_TEMPLATES.contact;
  
  const titleMap: Record<string, string> = {
    job: "Job Application Form",
    feedback: "Feedback Form",
    event: "Event Registration",
    contact: "Contact Form",
    survey: "Survey Form",
    order: "Order Form"
  };

  const questions: any[] = [];
  for (let i = 0; i < questionCount; i++) {
    const templateIndex = i % templates.length;
    const template = templates[templateIndex];
    questions.push({
      questionId: `q${i + 1}`,
      questionText: i < templates.length ? template.text : `Question ${i + 1}`,
      questionType: i < templates.length ? template.type : "short_answer",
      isRequired: i < templates.length ? template.required : false,
      orderIndex: i,
      options: (template as any).options || null
    });
  }

  return {
    title: titleMap[category] || `Form about ${prompt}`,
    description: `Please fill out this form regarding: ${prompt}`,
    questions,
    collectFullName: category !== 'survey',
    collectEmail: true,
    collectPhone: category === 'contact' || category === 'event' || category === 'order'
  };
}

function normalizeApiPath(pathname: string): string {
  if (!pathname) {
    return '';
  }

  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function resolveHuggingFaceEndpoint(rawUrl: string): string {
  if (!rawUrl) {
    return '';
  }

  try {
    const parsed = new URL(rawUrl);
    const normalizedPath = normalizeApiPath(HUGGINGFACE_API_PATH);

    if (parsed.hostname === 'huggingface.co') {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 3 && pathParts[0] === 'spaces') {
        const owner = pathParts[1];
        const spaceName = pathParts[2];
        return `https://${owner}-${spaceName}.hf.space${normalizedPath}`;
      }
    }

    if (parsed.hostname.endsWith('.hf.space') && normalizedPath) {
      parsed.pathname = normalizedPath;
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function normalizeQuestions(questions: any[]): any[] {
  return questions.map((question, index) => ({
    questionId: question?.questionId || `q${index + 1}`,
    questionText: question?.questionText || 'Question',
    questionType: question?.questionType || 'short_answer',
    isRequired: question?.isRequired ?? false,
    orderIndex: question?.orderIndex ?? index,
    options: Array.isArray(question?.options) ? question.options : null,
  }));
}

function parseGeneratedForm(payload: any) {
  const candidate = payload?.form || payload?.result || payload?.data || payload;

  if (candidate && typeof candidate === 'object' && candidate.title && Array.isArray(candidate.questions)) {
    return {
      ...candidate,
      questions: normalizeQuestions(candidate.questions),
    };
  }

  if (typeof candidate === 'string') {
    const jsonMatch = candidate.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.title && Array.isArray(parsed?.questions)) {
        return {
          ...parsed,
          questions: normalizeQuestions(parsed.questions),
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export const generateForm = async (prompt: string, questionCount: number = 10) => {
  const startedAt = Date.now();
  const resolvedEndpoint = resolveHuggingFaceEndpoint(HUGGINGFACE_API_URL);

  if (!resolvedEndpoint) {
    logger.warn('ML fallback: HUGGINGFACE_API_URL not configured', {
      durationMs: Date.now() - startedAt
    });
    return createFallback(prompt, questionCount);
  }

  try {
    logger.info('HF Space request started', {
      endpoint: resolvedEndpoint,
      questionCount,
      promptLength: prompt.length,
      timeoutMs: REQUEST_TIMEOUT
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (process.env.HUGGINGFACE_TOKEN) {
      headers.Authorization = `Bearer ${process.env.HUGGINGFACE_TOKEN}`;
    }

    const requestStartedAt = Date.now();
    const response = await axios.post(
      resolvedEndpoint,
      {
        prompt,
        questionCount,
        instructions: buildPrompt(prompt, questionCount),
      },
      {
        headers,
        timeout: REQUEST_TIMEOUT
      }
    );

    logger.info('HF Space response received', {
      status: response.status,
      durationMs: Date.now() - requestStartedAt
    });

    const parsedForm = parseGeneratedForm(response.data);
    if (parsedForm) {
      logger.info('ML generation parsed successfully', {
        durationMs: Date.now() - startedAt,
        questionCount: parsedForm.questions.length
      });
      return parsedForm;
    }

    logger.warn('ML fallback: HF Space response invalid', {
      durationMs: Date.now() - startedAt
    });
    return createFallback(prompt, questionCount);
  } catch (err: any) {
    const errorMessage = err.response?.status === 401
      ? 'Invalid HF token'
      : err.code === 'ECONNABORTED'
        ? 'HF Space request timeout'
        : 'HF Space request failed';
    
    logger.warn('ML fallback: HF Space request failed', {
      reason: errorMessage,
      status: err.response?.status,
      code: err.code,
      durationMs: Date.now() - startedAt,
      error: err.message
    });
    return createFallback(prompt, questionCount);
  }
};

export const ruleBasedFallback = (prompt: string, questionCount: number = 10) => {
  return createFallback(prompt, questionCount);
};
