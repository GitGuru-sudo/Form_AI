# FormAI — Bug Report & Fix Instructions

This document lists every bug found in a full audit of the `backend/` and `frontend/`
source, with the exact file, the problematic code, and the corrected code. Apply each
fix by replacing the **BEFORE** block with the **AFTER** block in the named file.

Severity legend: 🔴 critical (breaks core feature) · 🟠 functional · 🟡 minor/cosmetic · 🔵 perf · 🟣 security.

---

## BUG 1 🔴 — Responses (and personal info) are never saved

**File:** `backend/src/models/response.model.ts`

**Problem:** `answerText` is `required: true`. In Mongoose an empty string `""` FAILS a
`required` validator. The public form submits one answer object for *every* question
(`answerText: String(responses[q.questionId] || "")`), so the moment a respondent leaves
**any optional question blank**, the value is `""`, `.save()` throws a `ValidationError`,
the submit endpoint returns 500, and **nothing is stored** — not the answers, not the
personal info. The owner's responses page then shows zero responses. This is the root
cause of "responses / personal information not showing."

**BEFORE:**
```ts
const AnswerSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  answerText: { type: String, required: true }
});
```

**AFTER:**
```ts
const AnswerSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  // NOT required: a respondent may legitimately leave an optional question blank.
  // Mongoose treats "" as failing `required`, which previously made the whole
  // response (including personal info) fail to save with a 500.
  answerText: { type: String, default: '' }
});
```

---

## BUG 2 🔴 — `submitResponse` does not normalize/guard answers

**File:** `backend/src/controllers/responses.controller.ts` (function `submitResponse`)

**Problem:** Answers from the request body are saved verbatim. A non-string value
(rating number, yes/no, checkbox array) or a missing `questionId` can trip schema
validation. Normalize before saving.

**BEFORE:**
```ts
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
```

**AFTER:**
```ts
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
```

---

## BUG 3 🟠 — Required questions are not enforced on the public form

**File:** `frontend/src/app/f/[token]/page.tsx` (function `handleSubmit`)

**Problem:** Required questions render a red `*` but `FormRenderer` inputs have no
`required` attribute and nothing validates them, so respondents can submit required
questions blank. Also, checkbox answers (arrays) were stringified as `String([...])`
which omits the separating space. Add a required-check and a clean array join.

**BEFORE:**
```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const preparedAnswers: Answer[] = form!.questions.map(q => ({
      questionId: q.questionId,
      questionText: q.questionText,
      answerText: String(responses[q.questionId] || "")
    }))
```

**AFTER:**
```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Enforce required questions (the `*` was previously cosmetic only).
    const missing = form!.questions.filter(q => {
      if (!q.isRequired) return false
      const v = responses[q.questionId]
      if (Array.isArray(v)) return v.length === 0
      return !v || String(v).trim() === ""
    })
    if (missing.length > 0) {
      alert(`Please answer all required questions:\n${missing.map(m => `• ${m.questionText}`).join("\n")}`)
      return
    }

    const preparedAnswers: Answer[] = form!.questions.map(q => ({
      questionId: q.questionId,
      questionText: q.questionText,
      answerText: Array.isArray(responses[q.questionId])
        ? responses[q.questionId].join(", ")
        : String(responses[q.questionId] || "")
    }))
```

---

## BUG 4 🟠 — React state mutated during render (`.sort()`)

`.sort()` mutates the array in place. Here it mutates `form.questions`, which is React
state, during render — an anti-pattern that can cause subtle re-render bugs. Clone first.

**File A:** `frontend/src/app/f/[token]/page.tsx`

**BEFORE:**
```tsx
          {form.questions.sort((a, b) => a.orderIndex - b.orderIndex).map((q) => (
```
**AFTER:**
```tsx
          {[...form.questions].sort((a, b) => a.orderIndex - b.orderIndex).map((q) => (
```

**File B:** `frontend/src/app/forms/[id]/responses/page.tsx`

**BEFORE:**
```tsx
                    {form.questions.sort((a, b) => a.orderIndex - b.orderIndex).map((q) => {
```
**AFTER:**
```tsx
                    {[...form.questions].sort((a, b) => a.orderIndex - b.orderIndex).map((q) => {
```

---

## BUG 5 🟣 — Public form endpoint leaks the owner's Clerk user id

**File:** `backend/src/controllers/responses.controller.ts` (function `getPublicForm`)

**Problem:** The unauthenticated public endpoint returns the entire form document,
including `clerkUserId` (the owner's identity) and `__v`. Project them out.

**BEFORE:**
```ts
    const form = await Form.findOne({ shareToken: token });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
```
**AFTER:**
```ts
    // Exclude the owner's Clerk id and version key from this public, unauthenticated response.
    const form = await Form.findOne({ shareToken: token }).select('-clerkUserId -__v').lean();

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
```
> Note: this also adds `.lean()` (see BUG 9). The rest of the function (`form.isActive`
> check, `res.json(form)`) is unchanged.

---

## BUG 6 🟡 — CORS only accepts a single origin

**File:** `backend/src/index.ts`

**Problem:** `origin: process.env.ALLOWED_ORIGINS` passes the raw string; a comma-separated
list (prod + preview domains) won't match. Split it into an array.

**BEFORE:**
```ts
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  credentials: true
}));
```
**AFTER:**
```ts
// ALLOWED_ORIGINS may be a comma-separated list (e.g. prod + preview domains).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

---

## BUG 7 🟡 — Landing footer uses an invalid Tailwind class

**File:** `frontend/src/app/page.tsx` (the `<footer>` element)

**Problem:** `md:row` is not a real class; the footer should switch to a row on desktop
via `md:flex-row`.

**BEFORE:**
```tsx
      <footer className="container mx-auto px-6 py-12 border-t border-slate-900/50 flex flex-col md:row items-center justify-between gap-6 text-sm text-slate-500">
```
**AFTER:**
```tsx
      <footer className="container mx-auto px-6 py-12 border-t border-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
```

---

## CHANGE 8 🟠 — Question count: 1–50/default 10  →  1–10/default 5 (requested)

Five edits across four files. All bounds and defaults must agree front-to-back.

### 8a — `backend/src/controllers/ml.controller.ts`
**BEFORE:**
```ts
    let count = 10;
    if (questionCount !== undefined && questionCount !== null) {
      const parsed = parseInt(questionCount, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 50) {
        return res.status(400).json({ message: 'questionCount must be a positive integer between 1 and 50' });
      }
      count = parsed;
    }
```
**AFTER:**
```ts
    let count = 5;
    if (questionCount !== undefined && questionCount !== null) {
      const parsed = parseInt(questionCount, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 10) {
        return res.status(400).json({ message: 'questionCount must be a positive integer between 1 and 10' });
      }
      count = parsed;
    }
```

### 8b — `backend/src/services/ml.service.ts`
Replace **all** occurrences of `questionCount: number = 10` with `questionCount: number = 5`
(there are several: `buildPrompt` is unaffected, but `createFallback`, `generateForm`,
and `ruleBasedFallback` default params all use `= 10`).

### 8c — `frontend/src/app/dashboard/page.tsx`
**BEFORE (parseQuestionCount):**
```ts
  if (trimmed === "" || trimmed === "default" || trimmed === "skip" || trimmed === "10") {
    return 10;
  }
  const num = parseInt(input.trim(), 10);
  if (!isNaN(num) && num >= 1 && num <= 50) {
    return num;
  }
  return null;
```
**AFTER:**
```ts
  if (trimmed === "" || trimmed === "default" || trimmed === "skip" || trimmed === "5") {
    return 5;
  }
  const num = parseInt(input.trim(), 10);
  if (!isNaN(num) && num >= 1 && num <= 10) {
    return num;
  }
  return null;
```
Also change the two chat strings:
- `"Got it! How many questions would you like? (1-50, or press Enter for 10)"` → `"Got it! How many questions would you like? (1-10, or press Enter for 5)"`
- `"Please enter a number between 1-50, or press Enter for the default of 10."` → `"Please enter a number between 1-10, or press Enter for the default of 5."`

### 8d — `frontend/src/app/create/page.tsx`
Same `parseQuestionCount` change as 8c (1–50→1–10, default 10→5, `"10"`→`"5"`). Also:
- `"...reply with a number (1-50) or just press enter for the default of 10 questions."` → `"...reply with a number (1-10) or just press enter for the default of 5 questions."`
- `"Please enter a valid number between 1 and 50. For example: '10' or just press enter for the default of 10 questions."` → `"Please enter a valid number between 1 and 10. For example: '5' or just press enter for the default of 5 questions."`

---

## PERF 9 🔵 — API speed improvements (no external services needed)

### 9a — Add indexes
**`backend/src/models/response.model.ts`** — before the final `export default`:
```ts
// Responses are always queried/sorted by form + recency (getResponses, export,
// and the dashboard aggregate). This compound index serves all of them.
ResponseSchema.index({ formId: 1, submittedAt: -1 });
```
**`backend/src/models/form.model.ts`** — before the final `export default`:
```ts
// Dashboard lists a user's forms newest-first; public lookups hit shareToken (already
// indexed via `unique: true`).
FormSchema.index({ clerkUserId: 1, createdAt: -1 });
```

### 9b — Use `.lean()` on all read endpoints
Add `.lean()` to these queries (faster, lower memory — returns plain objects):
- `responses.controller.ts → getResponses`: `ResponseModel.find({ formId: id }).sort({ submittedAt: -1 }).lean()`
- `responses.controller.ts → exportResponses`: `ResponseModel.find({ formId: id }).sort({ submittedAt: -1 }).lean()`
- `responses.controller.ts → getPublicForm`: already covered in BUG 5.
- `forms.controller.ts → getFormById`: `Form.findOne({ _id: id, clerkUserId }).lean()`
- `forms.controller.ts → getForms`: `Form.find({ clerkUserId }).sort({ createdAt: -1 }).lean()`
  then change `...form.toObject()` to just `...form` in the `formsWithCounts` map.

> Do NOT add `.lean()` to queries whose document you mutate then `.save()`
> (e.g. `toggleFormStatus`, `updateForm`, the `form` lookup inside `submitResponse`).

### 9c — Connection pooling
**`backend/src/lib/mongodb.ts`** — inside `mongoose.connect(MONGODB_URL, { ... })`:
```ts
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        // Reuse a warm pool of connections instead of opening one per request.
        maxPoolSize: 20,
        minPoolSize: 2,
```

---

## Redis — recommendation (do NOT add yet)

Not needed for current functionality. The Excel export is generated on demand and
streamed (no storage needed), and the perf wins above cover normal load. Add Redis only
when going to real production traffic, in this priority:
1. **Rate-limit the public submit endpoint** `/api/f/:token/submit` (unauthenticated — abuse risk). Use `rate-limiter-flexible`.
2. **Cache `getPublicForm` by `shareToken`** (short TTL ~60s; invalidate on update/toggle/delete) — hottest read path.
3. *(Optional)* Cache ML generations by `hash(prompt + questionCount)` — marginal, shields against HF Space cold-starts.

---

## Notes (not bugs — informational)

- **Dead code:** `frontend/src/components/ResponseTable.tsx` and
  `backend/src/services/email.service.ts` (`sendFormInvite`) are not imported anywhere.
  Safe to delete, or keep for future use. (Note: `ResponseTable` is missing a
  `collectDateOfBirth` column, so don't reuse it as-is.)
- **Dead query param:** `create/preview/page.tsx` redirects to `/dashboard?published=<token>`
  but the dashboard never reads `published`, so no "form published" confirmation/link is
  shown. Optional: read `useSearchParams()` on the dashboard and show a toast with the link.
- **`file_upload` question type** exists in the builder but `FormRenderer` has no case for
  it (falls back to a text input) and there's no storage. If you want real uploads you'd
  need S3 + a presigned-URL flow; that's separate from the Excel export.

---

## Verification after applying

```bash
# Backend
cd backend && npx tsc --noEmit        # must exit 0

# Frontend
cd frontend && npx tsc --noEmit       # must exit 0
```

Manual smoke test:
1. Create/publish a form with a mix of required and optional questions.
2. Open the public link, leave a required question blank → submit must be blocked.
3. Fill required, leave an optional one blank → submit succeeds.
4. Owner → form → "View Responses": the response + all personal info appear.
5. "Download Excel" → a valid multi-row `.xlsx` downloads.
```
