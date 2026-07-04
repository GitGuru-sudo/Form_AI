# Export Responses as CSV and PDF (plus Google Sheets stretch)

> Status: Partially done — Excel (.xlsx) export already exists (`exportResponses` + `GET /api/forms/:id/responses/export`). This adds CSV and PDF alongside it. Effort: M. Area: Responses & analytics.

## Goal
Add CSV and PDF export to sit next to the existing Excel export. CSV is built with zero dependencies (manual RFC-4180 escaping). PDF uses `pdfkit`. The frontend's single "Download Excel" button becomes a dropdown menu (Excel / CSV / PDF) using the existing `ui/dropdown-menu.tsx`. Google Sheets is documented as an optional OAuth stretch only.

## Dependencies to install
```bash
cd backend && npm i pdfkit && npm i -D @types/pdfkit
```
(Backend npm has no Clerk peer-conflict, so `--legacy-peer-deps` is not required here — add it only if your install errors.)
Frontend: **None** (dropdown-menu and lucide icons already present).

## Files touched
- `backend/src/controllers/responses.controller.ts` — edit — add `exportResponsesCsv` and `exportResponsesPdf`.
- `backend/src/routes/responses.routes.ts` — edit — add two routes.
- `frontend/src/app/forms/[id]/responses/page.tsx` — edit — replace the single Download button with a dropdown; add CSV/PDF download handlers.

## Step-by-step

### Step 1 — Add CSV + PDF controllers (`backend/src/controllers/responses.controller.ts`)

**Find** (top imports):
```ts
import { Request, Response } from 'express';
import Form from '../models/form.model';
import ResponseModel from '../models/response.model';
import ExcelJS from 'exceljs';
```
**Replace with**:
```ts
import { Request, Response } from 'express';
import Form from '../models/form.model';
import ResponseModel from '../models/response.model';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
```

**Find** (end of the existing `exportResponses` function — the final lines before the file ends):
```ts
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=responses-${id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
```
**Replace with** (keeps `exportResponses` intact, appends two new exports + one shared helper):
```ts
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=responses-${id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Build the same header + row matrix used by every export format so they stay in sync.
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

// RFC-4180: quote a field if it contains comma, quote, CR or LF; double internal quotes.
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
    // Prepend a UTF-8 BOM so Excel opens non-ASCII answers correctly.
    const csv = '﻿' + lines.join('\r\n');

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

    // One block per response (a paginated table is fragile in pdfkit; readable record layout is robust).
    rows.forEach((row, idx) => {
      doc.fontSize(12).fillColor('#4f46e5').text(`Response ${idx + 1}`);
      doc.moveDown(0.2);
      headers.forEach((h, i) => {
        const val = row[i] || '-';
        doc.fontSize(9).fillColor('#334155').text(`${h}: `, { continued: true });
        doc.fillColor('#0f172a').text(val);
      });
      doc.moveDown(0.8);
      // Light divider between records.
      doc.strokeColor('#e2e8f0').lineWidth(0.5)
        .moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.6);
    });

    if (rows.length === 0) {
      doc.fontSize(12).fillColor('#64748b').text('No responses yet.');
    }

    doc.end();
  } catch (err: any) {
    // If headers already flushed (stream started), we can only end the response.
    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({ message: err.message });
    }
  }
};
```

### Step 2 — Add the routes (`backend/src/routes/responses.routes.ts`)

**Find**:
```ts
// Protected routes
router.get('/forms/:id/responses', requireAuth, responsesController.getResponses);
router.get('/forms/:id/responses/export', requireAuth, responsesController.exportResponses);
```
**Replace with**:
```ts
// Protected routes
router.get('/forms/:id/responses', requireAuth, responsesController.getResponses);
router.get('/forms/:id/responses/export', requireAuth, responsesController.exportResponses);
router.get('/forms/:id/responses/export/csv', requireAuth, responsesController.exportResponsesCsv);
router.get('/forms/:id/responses/export/pdf', requireAuth, responsesController.exportResponsesPdf);
```

### Step 3 — Replace the single Download button with a dropdown (`frontend/src/app/forms/[id]/responses/page.tsx`)

**Find** (imports):
```tsx
import { Download, ArrowLeft, Edit3 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
```
**Replace with**:
```tsx
import { Download, ArrowLeft, Edit3, ChevronDown, FileSpreadsheet, FileText, FileType } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
```

**Find** (the existing single export handler):
```tsx
  const handleExport = async () => {
    try {
      const token = await getToken()
      const response = await api.get(`/api/forms/${id}/responses/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `responses-${form?.title?.replace(/\s+/g, '-').toLowerCase() || id}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error("Export failed", err)
      toast.error("Couldn't export responses", { description: "Please try again." })
    }
  }
```
**Replace with** (one parameterised handler covering all three formats):
```tsx
  const handleExport = async (format: "xlsx" | "csv" | "pdf") => {
    const path =
      format === "xlsx"
        ? `/api/forms/${id}/responses/export`
        : `/api/forms/${id}/responses/export/${format}`
    try {
      const token = await getToken()
      const response = await api.get(path, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      const base = form?.title?.replace(/\s+/g, "-").toLowerCase() || id
      link.setAttribute("download", `responses-${base}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed", err)
      toast.error("Couldn't export responses", { description: "Please try again." })
    }
  }
```

**Find** (the single export button in the header):
```tsx
            <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700">
              <Download className="mr-2 h-4 w-4" /> Download Excel
            </Button>
```
**Replace with**:
```tsx
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={responses.length === 0}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <Download className="mr-2 h-4 w-4" /> Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border border-slate-800 text-white min-w-40">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="focus:bg-slate-800">
                  <FileSpreadsheet className="h-4 w-4 text-green-400" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="focus:bg-slate-800">
                  <FileText className="h-4 w-4 text-sky-400" /> CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="focus:bg-slate-800">
                  <FileType className="h-4 w-4 text-red-400" /> PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
```

## Edge cases & notes
- **CSV BOM**: the `﻿` prefix makes Excel respect UTF-8; if you ever pipe the CSV into a strict parser that chokes on the BOM, strip the first char.
- **pdfkit streaming errors**: if a DB error throws *after* `doc.pipe(res)` has started, headers are already sent — the catch only `res.end()`s. This is intentional; a half-written PDF is preferable to a hung request.
- **PDF layout**: a record-per-block layout is used instead of a fixed-width table because pdfkit has no built-in table primitive and wide forms overflow A4. Each field prints `Label: value`. Acceptable for review/printing; for spreadsheet analysis use CSV/Excel.
- The dropdown reuses the same `responseType: 'blob'` pattern already used by Excel — auth is the same Bearer token.
- `DropdownMenuItem` from base-ui forwards `onClick`; closing on select is automatic.

### Google Sheets (optional / stretch — not implemented)
High-level OAuth path only:
1. Add a Google Cloud project, enable the **Sheets API + Drive API**, create an OAuth 2.0 Web client.
2. Backend: `npm i googleapis`. Add `GET /api/google/auth` (redirects to Google consent with scope `spreadsheets`), and `GET /api/google/callback` (exchanges code → tokens, stores refresh token against `clerkUserId` in a new `GoogleToken` collection).
3. Add `POST /api/forms/:id/responses/export/sheets` (auth): create a spreadsheet via `sheets.spreadsheets.create`, write the `buildExportMatrix` headers+rows via `spreadsheets.values.update`, return the sheet URL.
4. Frontend: add a "Google Sheets" `DropdownMenuItem` that, if not connected, opens the consent popup, else POSTs and opens the returned URL.
Defer until single-user OAuth token storage + refresh handling is justified.

## Verification
- `cd backend && rtk tsc --noEmit` (or `npm run build`) — `pdfkit` + `@types/pdfkit` resolve, no type errors.
- Start backend, then with a valid token:
  - `curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/forms/<id>/responses/export/csv" -o out.csv` → opens cleanly in Excel/Sheets, header row + one row per response.
  - `curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/forms/<id>/responses/export/pdf" -o out.pdf` → valid PDF with title + record blocks.
- `cd frontend && rtk tsc` then `rtk next build` — responses page compiles.
- Manual: open responses page → **Export** dropdown shows Excel / CSV / PDF; each downloads the right file; the trigger is disabled when there are 0 responses.
