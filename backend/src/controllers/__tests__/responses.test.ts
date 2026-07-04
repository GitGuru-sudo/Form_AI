import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../models/form.model', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('../../models/response.model', () => {
  const ResponseModel: any = vi.fn().mockImplementation(function (this: any, doc: any) {
    Object.assign(this, doc);
    this.save = vi.fn().mockResolvedValue(undefined);
  });
  ResponseModel.find = vi.fn();
  return { default: ResponseModel };
});

import { app } from '../../index';
import Form from '../../models/form.model';

const mockedForm = Form as unknown as { findOne: ReturnType<typeof vi.fn> };

describe('POST /api/f/:token/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when the form does not exist', async () => {
    mockedForm.findOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/f/NOPE/submit')
      .send({ answers: [] });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('returns 403 when the form is closed', async () => {
    mockedForm.findOne.mockResolvedValueOnce({
      _id: 'f1',
      isActive: false,
      questions: [],
    });

    const res = await request(app)
      .post('/api/f/TKN/submit')
      .send({ answers: [] });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/closed/i);
  });

  it('returns 400 listing missing required question ids', async () => {
    mockedForm.findOne.mockResolvedValueOnce({
      _id: 'f1',
      isActive: true,
      questions: [
        { questionId: 'q1', questionText: 'Name', isRequired: true },
        { questionId: 'q2', questionText: 'Optional', isRequired: false },
      ],
    });

    const res = await request(app)
      .post('/api/f/TKN/submit')
      .send({ answers: [{ questionId: 'q2', questionText: 'Optional', answerText: 'hi' }] });

    expect(res.status).toBe(400);
    expect(res.body.questionIds).toContain('q1');
  });

  it('returns 201 and saves when required questions are answered', async () => {
    mockedForm.findOne.mockResolvedValueOnce({
      _id: 'f1',
      isActive: true,
      questions: [{ questionId: 'q1', questionText: 'Name', isRequired: true }],
    });

    const res = await request(app)
      .post('/api/f/TKN/submit')
      .send({
        respondentName: 'Ada',
        answers: [{ questionId: 'q1', questionText: 'Name', answerText: 'Ada' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/submitted/i);
  });

  it('coerces array answerText to a comma-joined string (no validation crash)', async () => {
    mockedForm.findOne.mockResolvedValueOnce({
      _id: 'f1',
      isActive: true,
      questions: [{ questionId: 'q1', questionText: 'Pick', isRequired: false }],
    });

    const res = await request(app)
      .post('/api/f/TKN/submit')
      .send({ answers: [{ questionId: 'q1', questionText: 'Pick', answerText: ['a', 'b'] }] });

    expect(res.status).toBe(201);
  });
});
