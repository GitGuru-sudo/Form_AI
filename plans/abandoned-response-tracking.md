# Abandoned / Partial Response Tracking

> Status: Not started. Effort: L. Area: Responses & analytics.

## Goal
Capture in-progress (partial) submissions so the owner can see drop-off: how many people started but never submitted, and which question they reached last. A new `PartialResponse` collection is written by a debounced autosave from the public form as the respondent answers; on final submit the partial is cleared. The responses page gains a "drop-off" summary.

## Design decision
**Use a separate `PartialResponse` collection** rather than a `status` field on `Response`. Reasons: (1) the public submit flow and required-question enforcement in `submitResponse` stay untouched; (2) partials are noisy, frequently-updated, and short-lived — keeping them out of `Response` means `getResponses`, exports, and charts need zero filtering changes; (3) we can clear/expire partials independently (TTL index) without risking real responses.

## Dependencies to install
None.

## Files touched
- `backend/src/models/partialResponse.model.ts` — new — the partial schema (one doc per session, upserted).
- `backend/src/controllers/responses.controller.ts` — edit — add `savePartialResponse`; clear partial on final submit.
- `backend/src/routes/responses.routes.ts` — edit — add `POST /api/f/:token/partial` (public).
- `frontend/src/app/f/[token]/page.tsx` — edit — generate a session id + debounced autosave effect.
- `frontend/src/app/forms/[id]/responses/page.tsx` — edit — fetch + render a drop-off summary card.

## Step-by-step

### Step 1 — Create the PartialResponse model (`backend/src/models/partialResponse.model.ts`)
Create `backend/src/models/partialResponse.model.ts` with full contents:
```ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPartialResponse extends Document {
  formId: mongoose.Types.ObjectId;
  sessionId: string;
  answeredCount: number;
  lastQuestionReached: string;
  lastQuestionText: string;
  updatedAt: Date;
  createdAt: Date;
}

const PartialResponseSchema: Schema = new Schema({
  formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
  // Client-generated per-visit id; one partial doc per (formId, sessionId).
  sessionId: { type: String, required: true },
  answeredCount: { type: Number, default: 0 },
  lastQuestionReached: { type: String, default: '' },
  lastQuestionText: { type: String, default: '' },
}, { timestamps: true });

// Upsert target: a visitor's partial is unique per form.
PartialResponseSchema.index({ formId: 1, sessionId: 1 }, { unique: true });

// Auto-expire stale partials 7 days after last update (TTL on updatedAt).
PartialResponseSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export default mongoose.model<IPartialResponse>('PartialResponse', PartialResponseSchema);
```

### Step 2 — Add the partial-save controller + clear-on-submit (`backend/src/controllers/responses.controller.ts`)

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
import PartialResponseModel from '../models/partialResponse.model';
import ExcelJS from 'exceljs';
```

**Find** (the save block in `submitResponse`):
```ts
    await newResponse.save();
    res.status(201).json({ message: 'Response submitted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
```
**Replace with** (clear the partial after a successful real submit, then append `savePartialResponse`):
```ts
    await newResponse.save();

    // A completed submission is no longer a drop-off: remove its partial if present.
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
      // Don't track partials for a closed form.
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
    // Autosave must never disrupt the respondent — log and 204.
    console.error('Partial save failed:', err.message);
    res.status(204).end();
  }
};
```
> Note: `submitResponse` reads `sessionId` off `req.body`; the public form (Step 4) sends it alongside the existing payload. It's ignored by `ResponseModel` (not in its schema), so the real response document is unaffected.

### Step 3 — Add the public route (`backend/src/routes/responses.routes.ts`)

**Find**:
```ts
// Public routes
router.get('/f/:token', responsesController.getPublicForm);
router.post('/f/:token/submit', responsesController.submitResponse);
```
**Replace with**:
```ts
// Public routes
router.get('/f/:token', responsesController.getPublicForm);
router.post('/f/:token/submit', responsesController.submitResponse);
router.post('/f/:token/partial', responsesController.savePartialResponse);
```

### Step 4 — Debounced autosave on the public form (`frontend/src/app/f/[token]/page.tsx`)

**Find** (imports + the start of the component's state):
```tsx
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
```
**Replace with**:
```tsx
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
```

**Find** (state declarations at the top of `PublicFormPage`):
```tsx
  const { token } = useParams()
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
```
**Replace with**:
```tsx
  const { token } = useParams()
  // Stable per-visit id used to upsert this visitor's partial-response doc.
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
```

**Find** (the existing fetch effect — insert the autosave effect right after it):
```tsx
  useEffect(() => {
    api.get(`/api/f/${token}`).then((res) => {
      if (res.data.closed) {
        setClosed(true)
      } else {
        setForm(res.data)
      }
    }).catch(err => {
      console.error(err)
    }).finally(() => {
      setLoading(false)
    })
  }, [token])
```
**Replace with**:
```tsx
  useEffect(() => {
    api.get(`/api/f/${token}`).then((res) => {
      if (res.data.closed) {
        setClosed(true)
      } else {
        setForm(res.data)
      }
    }).catch(err => {
      console.error(err)
    }).finally(() => {
      setLoading(false)
    })
  }, [token])

  // Debounced autosave: 1.2s after the respondent stops typing, record progress.
  // Skips once submitted; failures are silent (server returns 204 regardless).
  useEffect(() => {
    if (!form || isSubmitted) return
    const answeredIds = Object.keys(responses).filter(qid => {
      const v = responses[qid]
      if (Array.isArray(v)) return v.length > 0
      return v != null && String(v).trim() !== ""
    })
    if (answeredIds.length === 0) return

    const ordered = [...form.questions].sort((a, b) => a.orderIndex - b.orderIndex)
    const lastQ = [...ordered].reverse().find(q => answeredIds.includes(q.questionId))

    const handle = window.setTimeout(() => {
      api.post(`/api/f/${token}/partial`, {
        sessionId: sessionIdRef.current,
        answeredCount: answeredIds.length,
        lastQuestionReached: lastQ?.questionId ?? "",
        lastQuestionText: lastQ?.questionText ?? "",
      }).catch(() => { /* autosave is best-effort */ })
    }, 1200)

    return () => window.clearTimeout(handle)
  }, [responses, form, isSubmitted, token])
```

**Find** (the submit payload — include the sessionId so the backend can clear the partial):
```tsx
      await api.post(`/api/f/${token}/submit`, {
        ...personalInfo,
        answers: preparedAnswers
      })
```
**Replace with**:
```tsx
      await api.post(`/api/f/${token}/submit`, {
        ...personalInfo,
        sessionId: sessionIdRef.current,
        answers: preparedAnswers
      })
```

### Step 5 — Drop-off summary on the responses page (`frontend/src/app/forms/[id]/responses/page.tsx`)

This needs a read endpoint for partials. **Add the controller + route first**, then the UI.

**5a. Controller** (`backend/src/controllers/responses.controller.ts`) — **Find** the end of `getResponses`:
```ts
    const responses = await ResponseModel.find({ formId: id }).sort({ submittedAt: -1 }).lean();
    res.json(responses);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
```
**Replace with**:
```ts
    const responses = await ResponseModel.find({ formId: id }).sort({ submittedAt: -1 }).lean();
    res.json(responses);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
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

    // Count how many abandoned at each last-reached question.
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
```

**5b. Route** (`backend/src/routes/responses.routes.ts`) — **Find**:
```ts
router.get('/forms/:id/responses', requireAuth, responsesController.getResponses);
router.get('/forms/:id/responses/export', requireAuth, responsesController.exportResponses);
```
**Replace with**:
```ts
router.get('/forms/:id/responses', requireAuth, responsesController.getResponses);
router.get('/forms/:id/responses/partials', requireAuth, responsesController.getPartialStats);
router.get('/forms/:id/responses/export', requireAuth, responsesController.exportResponses);
```

**5c. UI** (`frontend/src/app/forms/[id]/responses/page.tsx`) — **Find** state declarations:
```tsx
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
```
**Replace with**:
```tsx
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [partialStats, setPartialStats] = useState<{ total: number; dropoff: { questionId: string; questionText: string; count: number }[] } | null>(null)
```

**Find** (the parallel fetch in the effect — add the partials fetch):
```tsx
        const [formRes, respRes] = await Promise.all([
          api.get(`/api/forms/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/api/forms/${id}/responses`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        setForm(formRes.data)
        setResponses(respRes.data)
```
**Replace with**:
```tsx
        const [formRes, respRes, partRes] = await Promise.all([
          api.get(`/api/forms/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/api/forms/${id}/responses`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/api/forms/${id}/responses/partials`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        setForm(formRes.data)
        setResponses(respRes.data)
        setPartialStats(partRes.data)
```

**Find** (the responses body conditional start — insert the drop-off card just before it):
```tsx
          {responses.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <p className="text-lg">No responses yet.</p>
```
**Replace with**:
```tsx
          {partialStats && partialStats.total > 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
              <div className="flex items-center justify-between border-b border-amber-500/10 pb-3 mb-3">
                <h3 className="font-semibold text-amber-300">Started but didn&apos;t submit</h3>
                <span className="text-2xl font-bold text-amber-300">{partialStats.total}</span>
              </div>
              <ul className="space-y-2 text-sm">
                {partialStats.dropoff.map(d => (
                  <li key={d.questionId} className="flex items-center justify-between">
                    <span className="text-slate-300 truncate">Last reached: {d.questionText}</span>
                    <span className="text-slate-500">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {responses.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <p className="text-lg">No responses yet.</p>
```

## Edge cases & notes
- **One partial per visitor**: keyed by `(formId, sessionId)` with a unique index; the autosave upserts, so progress overwrites rather than accumulating rows.
- **Cleared on submit**: a completed submission deletes its partial (fire-and-forget), so a finished respondent never appears as a drop-off. Requires the public form to send `sessionId` in the submit body (Step 4).
- **TTL cleanup**: partials self-expire 7 days after last update via the `updatedAt` TTL index — no cron needed. Mongo's TTL monitor runs ~every 60s.
- **Closed form**: `savePartialResponse` returns 204 without writing when `isActive` is false.
- **Privacy**: only progress metadata is stored (counts + last question id/text), *not* the in-progress answers themselves — keeps the partial collection light and avoids storing half-entered PII.
- **Best-effort autosave**: the endpoint always returns 204 (even on error) and the client `.catch`es silently, so tracking never interferes with the respondent.
- **Debounce = 1.2s**; the cleanup clears the pending timer on every `responses` change so only one POST fires per pause. `crypto.randomUUID` is available in all evergreen browsers; a fallback id is provided.
- Composes with the realtime plan (partials could also be re-fetched on poll) and the filtering plan (drop-off card sits above the filtered list, unaffected).

## Verification
- `cd backend && rtk tsc --noEmit` (or `npm run build`) — new model + two controllers + routes compile.
- `cd frontend && rtk tsc` then `rtk next build` — public form + responses page compile.
- Manual:
  1. Open a public form, answer 1–2 questions, **don't** submit, wait ~2s → confirm a `POST /api/f/:token/partial` (204) in the network panel.
  2. Open the owner's responses page → a "Started but didn't submit: 1" card shows the last-reached question.
  3. Return to the public form (same tab/session), finish and submit → re-open responses; the drop-off total drops by one (partial cleared).
  4. Verify in Mongo that `partialresponses` has the doc while abandoned and it's gone after submit.
