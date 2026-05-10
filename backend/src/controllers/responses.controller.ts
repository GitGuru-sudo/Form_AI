import { Request, Response } from 'express';
import Form from '../models/form.model';
import ResponseModel from '../models/response.model';

export const getResponses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = (req as any).auth?.userId;

    const form = await Form.findOne({ _id: id, clerkUserId });
    if (!form) {
      return res.status(404).json({ message: 'Form not found or unauthorized' });
    }

    const responses = await ResponseModel.find({ formId: id }).sort({ submittedAt: -1 });
    res.json(responses);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getPublicForm = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const form = await Form.findOne({ shareToken: token });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    if (!form.isActive) {
      return res.json({ closed: true });
    }

    res.json(form);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const submitResponse = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { respondentName, respondentEmail, respondentPhone, respondentAge, respondentDOB, respondentGender, answers } = req.body;

    const form = await Form.findOne({ shareToken: token });
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    if (!form.isActive) {
      return res.status(403).json({ message: 'Form is closed' });
    }

    const newResponse = new ResponseModel({
      formId: form._id,
      respondentName,
      respondentEmail,
      respondentPhone,
      respondentAge,
      respondentDOB,
      respondentGender,
      answers
    });

    await newResponse.save();
    res.status(201).json({ message: 'Response submitted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const exportResponses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = (req as any).auth?.userId;

    const form = await Form.findOne({ _id: id, clerkUserId });
    if (!form) {
      return res.status(404).json({ message: 'Form not found or unauthorized' });
    }

    const responses = await ResponseModel.find({ formId: id }).sort({ submittedAt: -1 });

    // Header logic
    const headers = ['Submitted At'];
    if (form.collectFullName) headers.push('Name');
    if (form.collectEmail) headers.push('Email');
    if (form.collectPhone) headers.push('Phone');
    if (form.collectAge) headers.push('Age');
    if (form.collectDateOfBirth) headers.push('DOB');
    if (form.collectGender) headers.push('Gender');

    form.questions.forEach(q => headers.push(q.questionText));

    const csvRows = responses.map(r => {
      const row = [r.submittedAt.toISOString()];
      if (form.collectFullName) row.push(r.respondentName || '');
      if (form.collectEmail) row.push(r.respondentEmail || '');
      if (form.collectPhone) row.push(r.respondentPhone || '');
      if (form.collectAge) row.push(r.respondentAge?.toString() || '');
      if (form.collectDateOfBirth) row.push(r.respondentDOB?.toISOString() || '');
      if (form.collectGender) row.push(r.respondentGender || '');

      form.questions.forEach(q => {
        const ans = r.answers.find(a => a.questionId === q.questionId);
        row.push(ans ? ans.answerText : '');
      });

      return row.join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=responses-${id}.csv`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
