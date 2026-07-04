import { Request, Response } from 'express';
import Form from '../models/form.model';
import ResponseModel from '../models/response.model';
import PartialResponseModel from '../models/partialResponse.model';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { sendNewResponseNotification } from '../services/email.service';

export const getResponses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = req.clerkUserId;

    const form = await Form.findOne({ _id: id, clerkUserId });
    if (!form) {
      return res.status(404).json({ message: 'Form not found or unauthorized' });
    }

    const responses = await ResponseModel.find({ formId: id }).sort({ submittedAt: -1 }).lean();
    res.json(responses);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getPublicForm = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    // Exclude the owner's Clerk id and version key from this public, unauthenticated response.
    const form = await Form.findOne({ shareToken: token }).select('-clerkUserId -__v').lean();

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

    // Normalise answers: coerce answerText to a string so a number/boolean/array
    // value (rating, yes_no, checkbox) never trips schema validation.
    const normalizedAnswers = Array.isArray(answers)
      ? answers
          .filter((a: any) => a && a.questionId)
          .map((a: any) => ({
            questionId: String(a.questionId),
            questionText: String(a.questionText ?? ''),
            answerText: Array.isArray(a.answerText)
              ? a.answerText.join(', ')
              : String(a.answerText ?? '')
          }))
      : [];

    // Server-side enforcement of required questions (client checks can be bypassed).
    const answerMap = new Map(normalizedAnswers.map(a => [a.questionId, a.answerText]));
    const missingRequired = form.questions.filter(
      (q: any) => q.isRequired && !(answerMap.get(q.questionId) || '').trim()
    );
    if (missingRequired.length > 0) {
      return res.status(400).json({
        message: 'Please answer all required questions',
        questionIds: missingRequired.map((q: any) => q.questionId)
      });
    }

    // Server-side validation-rule enforcement (mirrors the client validateAnswer).
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_RE = /^[+]?[\d\s()-]{7,}$/;
    const ruleViolations: string[] = [];
    for (const q of form.questions as any[]) {
      const raw = (answerMap.get(q.questionId) || '').trim();
      if (!raw) continue; // empty handled by required check above
      const v = q.validation;

      if (q.questionType === 'email' || v?.format === 'email') {
        if (!EMAIL_RE.test(raw)) { ruleViolations.push(q.questionId); continue; }
      }
      if (q.questionType === 'phone' || v?.format === 'phone') {
        if (!PHONE_RE.test(raw)) { ruleViolations.push(q.questionId); continue; }
      }
      if (!v) continue;

      if (v.minLength != null && raw.length < v.minLength) { ruleViolations.push(q.questionId); continue; }
      if (v.maxLength != null && raw.length > v.maxLength) { ruleViolations.push(q.questionId); continue; }
      if (v.min != null || v.max != null) {
        const num = Number(raw);
        if (Number.isNaN(num) ||
            (v.min != null && num < v.min) ||
            (v.max != null && num > v.max)) {
          ruleViolations.push(q.questionId); continue;
        }
      }
      if (v.pattern) {
        try {
          if (!new RegExp(v.pattern).test(raw)) { ruleViolations.push(q.questionId); continue; }
        } catch {
          // Ignore an invalid author regex on the server too.
        }
      }
    }
    if (ruleViolations.length > 0) {
      return res.status(400).json({
        message: 'Some answers do not meet the required format',
        questionIds: ruleViolations
      });
    }

    const newResponse = new ResponseModel({
      formId: form._id,
      respondentName,
      respondentEmail,
      respondentPhone,
      respondentAge,
      respondentDOB,
      respondentGender,
      answers: normalizedAnswers
    });

    await newResponse.save();

    if (form.notifyOnResponse && form.notifyEmail) {
      sendNewResponseNotification(form.notifyEmail, form.title, form._id.toString())
        .catch(err => console.error('Notification dispatch failed:', err));
    }

    const { sessionId } = req.body;
    if (sessionId) {
      PartialResponseModel.deleteOne({ formId: form._id, sessionId })
        .catch(err => console.error('Failed to clear partial:', err));
    }

    res.status(201).json({ message: 'Response submitted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const savePartialResponse = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { sessionId, answeredCount, lastQuestionReached, lastQuestionText } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    const form = await Form.findOne({ shareToken: token }).select('_id isActive').lean();
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
    if (!form.isActive) {
      return res.status(204).end();
    }

    await PartialResponseModel.updateOne(
      { formId: form._id, sessionId: String(sessionId) },
      {
        $set: {
          answeredCount: Number(answeredCount) || 0,
          lastQuestionReached: String(lastQuestionReached ?? ''),
          lastQuestionText: String(lastQuestionText ?? ''),
        },
      },
      { upsert: true }
    );

    res.status(204).end();
  } catch (err: any) {
    console.error('Partial save failed:', err.message);
    res.status(204).end();
  }
};

export const getPartialStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = req.clerkUserId;

    const form = await Form.findOne({ _id: id, clerkUserId }).lean();
    if (!form) {
      return res.status(404).json({ message: 'Form not found or unauthorized' });
    }

    const partials = await PartialResponseModel.find({ formId: id }).lean();

    const byQuestion = new Map<string, { questionText: string; count: number }>();
    for (const p of partials) {
      const key = p.lastQuestionReached || 'unknown';
      const entry = byQuestion.get(key) || { questionText: p.lastQuestionText || '—', count: 0 };
      entry.count += 1;
      byQuestion.set(key, entry);
    }

    res.json({
      total: partials.length,
      dropoff: [...byQuestion.entries()].map(([questionId, v]) => ({
        questionId,
        questionText: v.questionText,
        count: v.count,
      })).sort((a, b) => b.count - a.count),
    });
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

    const responses = await ResponseModel.find({ formId: id }).sort({ submittedAt: -1 }).lean();

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

function buildExportMatrix(form: any, responses: any[]): { headers: string[]; rows: string[][] } {
  const headers: string[] = ['Filled At'];
  if (form.collectFullName) headers.push('Name');
  if (form.collectEmail) headers.push('Email');
  if (form.collectPhone) headers.push('Phone');
  if (form.collectAge) headers.push('Age');
  if (form.collectDateOfBirth) headers.push('DOB');
  if (form.collectGender) headers.push('Gender');
  form.questions.forEach((q: any) => headers.push(q.questionText));

  const rows = responses.map((r: any) => {
    const row: string[] = [new Date(r.submittedAt).toISOString()];
    if (form.collectFullName) row.push(r.respondentName || '');
    if (form.collectEmail) row.push(r.respondentEmail || '');
    if (form.collectPhone) row.push(r.respondentPhone || '');
    if (form.collectAge) row.push(r.respondentAge != null ? String(r.respondentAge) : '');
    if (form.collectDateOfBirth) row.push(r.respondentDOB ? new Date(r.respondentDOB).toISOString().split('T')[0] : '');
    if (form.collectGender) row.push(r.respondentGender || '');
    form.questions.forEach((q: any) => {
      const ans = r.answers.find((a: any) => a.questionId === q.questionId);
      row.push(ans ? ans.answerText : '');
    });
    return row;
  });

  return { headers, rows };
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const exportResponsesCsv = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = req.clerkUserId;

    const form = await Form.findOne({ _id: id, clerkUserId });
    if (!form) {
      return res.status(404).json({ message: 'Form not found or unauthorized' });
    }

    const responses = await ResponseModel.find({ formId: id }).sort({ submittedAt: -1 }).lean();
    const { headers, rows } = buildExportMatrix(form, responses);

    const lines = [headers, ...rows].map(cols => cols.map(csvEscape).join(','));
    const csv = '\uFEFF' + lines.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=responses-${id}.csv`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const exportResponsesPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = req.clerkUserId;

    const form = await Form.findOne({ _id: id, clerkUserId });
    if (!form) {
      return res.status(404).json({ message: 'Form not found or unauthorized' });
    }

    const responses = await ResponseModel.find({ formId: id }).sort({ submittedAt: -1 }).lean();
    const { headers, rows } = buildExportMatrix(form, responses);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=responses-${id}.pdf`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#1e293b').text(form.title, { underline: false });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#64748b').text(`${rows.length} response${rows.length !== 1 ? 's' : ''} · exported ${new Date().toISOString().split('T')[0]}`);
    doc.moveDown(1);

    rows.forEach((row, idx) => {
      doc.fontSize(12).fillColor('#4f46e5').text(`Response ${idx + 1}`);
      doc.moveDown(0.2);
      headers.forEach((h, i) => {
        const val = row[i] || '-';
        doc.fontSize(9).fillColor('#334155').text(`${h}: `, { continued: true });
        doc.fillColor('#0f172a').text(val);
      });
      doc.moveDown(0.8);
      doc.strokeColor('#e2e8f0').lineWidth(0.5)
        .moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.6);
    });

    if (rows.length === 0) {
      doc.fontSize(12).fillColor('#64748b').text('No responses yet.');
    }

    doc.end();
  } catch (err: any) {
    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({ message: err.message });
    }
  }
};
