# Email Notifications on New Response (Resend)

> Status: Partially done — Resend is installed and `email.service.ts` already exports `sendFormInvite`. This adds a new-response notification on top. Effort: M. Area: Responses & analytics.

## Goal
When a form configured with notifications receives a new response, email the owner (fire-and-forget, after the response is saved) using the **already-installed Resend** integration. Add `notifyOnResponse` + `notifyEmail` to the Form model, a toggle + email input in the editor, look the address up in `submitResponse`, and add a `sendNewResponseNotification` to the email service. A daily digest is sketched as optional.

## Dependencies to install
None. `resend@^6.12.2` is already a backend dependency and `email.service.ts` already constructs the client.

## Files touched
- `backend/src/models/form.model.ts` — edit — add `notifyOnResponse` + `notifyEmail` to interface and schema.
- `backend/src/services/email.service.ts` — edit — add `sendNewResponseNotification`.
- `backend/src/controllers/responses.controller.ts` — edit — fire the notification after save in `submitResponse`.
- `frontend/src/types/index.ts` — edit — add the two fields to the `Form` interface.
- `frontend/src/app/forms/[id]/page.tsx` — edit — add the notification toggle + email input to the editor header.

## Step-by-step

### Step 1 — Extend the Form model (`backend/src/models/form.model.ts`)

**Find** (interface fields):
```ts
  collectDateOfBirth: boolean;
  collectGender: boolean;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}
```
**Replace with**:
```ts
  collectDateOfBirth: boolean;
  collectGender: boolean;
  notifyOnResponse: boolean;
  notifyEmail?: string;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Find** (schema fields):
```ts
  collectDateOfBirth: { type: Boolean, default: false },
  collectGender: { type: Boolean, default: false },
  questions: [QuestionSchema],
}, { timestamps: true });
```
**Replace with**:
```ts
  collectDateOfBirth: { type: Boolean, default: false },
  collectGender: { type: Boolean, default: false },
  notifyOnResponse: { type: Boolean, default: false },
  notifyEmail: { type: String },
  questions: [QuestionSchema],
}, { timestamps: true });
```
> Note: `updateForm` in `forms.controller.ts` uses `stripProtectedFields` then `$set` of the raw body, and `notifyOnResponse`/`notifyEmail` are **not** in `PROTECTED_FIELDS`, so the editor PATCH will persist them with no controller change.

### Step 2 — Add the notification email function (`backend/src/services/email.service.ts`)

**Find** (the end of the existing `sendFormInvite` function):
```ts
  } catch (err) {
    console.error('Failed to send email:', err);
  }
};
```
**Replace with** (keeps `sendFormInvite`, appends the new function):
```ts
  } catch (err) {
    console.error('Failed to send email:', err);
  }
};

export const sendNewResponseNotification = async (
  toEmail: string,
  formTitle: string,
  formId: string
) => {
  if (!resend) {
    console.warn('Resend API Key is missing. Notification skipped.');
    return;
  }
  if (!toEmail) return;

  const dashboardBase = process.env.APP_URL || 'http://localhost:3000';
  const link = `${dashboardBase}/forms/${formId}/responses`;

  try {
    await resend.emails.send({
      from: 'FormAI <onboarding@resend.dev>',
      to: [toEmail],
      subject: `New response: ${formTitle}`,
      html: `
        <h1>You've got a new response</h1>
        <p>Your form <strong>${formTitle}</strong> just received a new submission.</p>
        <p><a href="${link}">View responses</a></p>
        <p style="color:#64748b;font-size:12px">Built with FormAI</p>
      `
    });
  } catch (err) {
    console.error('Failed to send notification email:', err);
  }
};
```
> `APP_URL` is a new optional env var (the frontend origin). Falls back to localhost; the email still sends if unset.

### Step 3 — Fire the notification after save (`backend/src/controllers/responses.controller.ts`)

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
import { sendNewResponseNotification } from '../services/email.service';
```

**Find** (the save + response inside `submitResponse`):
```ts
    await newResponse.save();
    res.status(201).json({ message: 'Response submitted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
```
**Replace with**:
```ts
    await newResponse.save();

    // Fire-and-forget: never let email delivery block or fail the respondent's submission.
    if (form.notifyOnResponse && form.notifyEmail) {
      sendNewResponseNotification(form.notifyEmail, form.title, form._id.toString())
        .catch(err => console.error('Notification dispatch failed:', err));
    }

    res.status(201).json({ message: 'Response submitted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
```

### Step 4 — Add the fields to the frontend Form type (`frontend/src/types/index.ts`)

**Find**:
```ts
  collectDateOfBirth: boolean;
  collectGender: boolean;
  questions: Question[];
  responseCount?: number;
```
**Replace with**:
```ts
  collectDateOfBirth: boolean;
  collectGender: boolean;
  notifyOnResponse?: boolean;
  notifyEmail?: string;
  questions: Question[];
  responseCount?: number;
```

### Step 5 — Add the toggle + email input to the editor (`frontend/src/app/forms/[id]/page.tsx`)

**Find** (imports):
```ts
import { ArrowLeft, Save, Copy, Check, Download, Loader2 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
```
**Replace with**:
```ts
import { ArrowLeft, Save, Copy, Check, Download, Loader2, Bell } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import api from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
```

**Find** (the Title & Description block — insert a notifications card right after it):
```tsx
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm((prev) => ({ ...prev!, description: e.target.value }))}
              className="text-slate-400 bg-transparent border-0 focus-visible:ring-0 resize-none min-h-0 h-auto py-0 px-0"
              placeholder="Add a description..."
            />
          </div>
```
**Replace with**:
```tsx
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm((prev) => ({ ...prev!, description: e.target.value }))}
              className="text-slate-400 bg-transparent border-0 focus-visible:ring-0 resize-none min-h-0 h-auto py-0 px-0"
              placeholder="Add a description..."
            />
          </div>

          {/* Email notifications */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-indigo-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Email me on new responses</h3>
                  <p className="text-sm text-slate-400">Get an email each time someone submits this form.</p>
                </div>
              </div>
              <Switch
                checked={!!form.notifyOnResponse}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev!, notifyOnResponse: checked }))}
              />
            </div>
            {form.notifyOnResponse && (
              <div className="space-y-2 pl-8">
                <Label htmlFor="notify-email" className="text-slate-300">Send notifications to</Label>
                <Input
                  id="notify-email"
                  type="email"
                  value={form.notifyEmail || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev!, notifyEmail: e.target.value }))}
                  placeholder="you@example.com"
                  className="bg-slate-950 border-slate-800 max-w-sm"
                />
              </div>
            )}
          </div>
```
> `Input` is already imported in this file (line 6). `onCheckedChange` is the base-ui Switch callback. Saving uses the existing `handleSave` → PATCH `/api/forms/:id` with the full `form`, which now carries the two fields.

## Edge cases & notes
- **No RESEND_API_KEY**: `sendNewResponseNotification` early-returns with a warning (same guard as `sendFormInvite`). The form still saves and the respondent still gets a success response.
- **Empty notifyEmail**: the controller checks `form.notifyEmail` truthiness, and the service double-guards `if (!toEmail) return`.
- **Fire-and-forget**: the await is intentionally *not* on the response path — `.catch` swallows failures so a flaky email never turns a 201 into a 500.
- **Resend sandbox**: `onboarding@resend.dev` only delivers to the Resend account's own verified email until a domain is verified. For real multi-recipient delivery, verify a domain and change the `from`. Document this for the user.
- **Set `APP_URL`** in backend `.env` to your deployed frontend origin so the "View responses" link is correct in production.

### Optional: daily digest (not implemented)
Instead of per-response emails, batch them. Sketch:
- Add `sendDailyDigest(toEmail, formTitle, formId, count)` to the email service.
- Add a scheduled job (e.g. `node-cron` or a platform cron hitting an internal endpoint) that, once a day, groups responses from the last 24h per form where `notifyOnResponse` is true and emails a summary count + link.
- Gate per-response vs. digest behind a `notifyMode: 'each' | 'daily'` field. Defer until volume makes per-response noisy.

## Verification
- `cd backend && rtk tsc --noEmit` (or `npm run build`) — model, service, controller compile.
- `cd frontend && rtk tsc` then `rtk next build` — type + editor compile.
- Manual: in the editor toggle **Email me on new responses** on, enter your Resend-verified address, **Save Changes**. Submit via the public form → check the inbox for "New response: <title>" with a working "View responses" link. With the toggle off, no email is sent. With `RESEND_API_KEY` unset, submission still succeeds and a warning is logged.
