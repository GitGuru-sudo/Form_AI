import { Request, Response } from 'express';
import Form from '../models/form.model';
import ResponseModel from '../models/response.model';
import ExcelJS from 'exceljs';

export const getResponses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = req.clerkUserId;

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
    const clerkUserId = req.clerkUserId;

    const form = await Form.findOne({ _id: id, clerkUserId });
    if (!form) {
      return res.status(404).json({ message: 'Form not found or unauthorized' });
    }

    const responses = await ResponseModel.find({ formId: id }).sort({ submittedAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Responses');

    const headers: string[] = ['Filled At'];
    if (form.collectFullName) headers.push('Name');
    if (form.collectEmail) headers.push('Email');
    if (form.collectPhone) headers.push('Phone');
    if (form.collectAge) headers.push('Age');
    if (form.collectDateOfBirth) headers.push('DOB');
    if (form.collectGender) headers.push('Gender');
    form.questions.forEach(q => headers.push(q.questionText));

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    responses.forEach(r => {
      const row: any[] = [r.submittedAt.toISOString()];
      if (form.collectFullName) row.push(r.respondentName || '');
      if (form.collectEmail) row.push(r.respondentEmail || '');
      if (form.collectPhone) row.push(r.respondentPhone || '');
      if (form.collectAge) row.push(r.respondentAge ?? '');
      if (form.collectDateOfBirth) row.push(r.respondentDOB ? r.respondentDOB.toISOString().split('T')[0] : '');
      if (form.collectGender) row.push(r.respondentGender || '');

      form.questions.forEach(q => {
        const ans = r.answers.find((a: any) => a.questionId === q.questionId);
        row.push(ans ? ans.answerText : '');
      });

      sheet.addRow(row);
    });

    sheet.columns.forEach((column: Partial<ExcelJS.Column>) => {
      let maxLength = 10;
      if (column && column.eachCell) {
        column.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
          const len = cell.value ? String(cell.value).length : 10;
          if (len > maxLength) maxLength = len;
        });
      }
      if (column) {
        column.width = Math.min(maxLength + 4, 50);
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=responses-${id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
