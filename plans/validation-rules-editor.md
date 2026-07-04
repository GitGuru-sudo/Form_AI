# Validation Rules Editor

> Status: Not started. Effort: M. Area: Form building & UX.

## Goal
Add per-question validation rules (min/max length, min/max number, regex pattern, email/phone format) to FormAI. Authors configure rules in a collapsible "Validation" section on each `QuestionCard`. Rules are enforced both client-side (inline errors on the public form) and server-side in `submitResponse` so the checks can't be bypassed.

## Dependencies to install
None — all primitives already exist (`Input`, `Switch`, `Label`, lucide icons, Mongoose mixed sub-schema).

## Files touched
- `frontend/src/types/index.ts` — edit — add `QuestionValidation` type and `validation?` field on `Question`.
- `frontend/src/components/QuestionCard.tsx` — edit — add a collapsible Validation section.
- `frontend/src/components/FormRenderer.tsx` — edit — export a reusable `validateAnswer()` helper (no UI change required there, but the helper lives next to the renderer).
- `frontend/src/app/f/[token]/page.tsx` — edit — run validation on submit, show inline messages.
- `backend/src/models/form.model.ts` — edit — add `validation` sub-document to `QuestionSchema` + `IQuestion`.
- `backend/src/controllers/responses.controller.ts` — edit — enforce validation in `submitResponse`.

## Step-by-step

### Step 1 — Extend the `Question` type (`frontend/src/types/index.ts`)
**Find**:
```ts
export interface Question {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
}
```
**Replace with**:
```ts
export interface QuestionValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  format?: "email" | "phone";
}

export interface Question {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
  validation?: QuestionValidation;
}
```

### Step 2 — Add a shared `validateAnswer` helper (`frontend/src/components/FormRenderer.tsx`)
**Find** (top of file, the imports block):
```ts
import { Question } from "@/types"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
```
**Replace with**:
```ts
import { Question } from "@/types"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

// Built-in format patterns. Kept loose on purpose — these gate obvious typos,
// not RFC-perfect validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+]?[\d\s()-]{7,}$/

// Returns an error string if the value violates the question's validation rules,
// or null if it passes. Empty values pass here — "required" is enforced separately.
export function validateAnswer(question: Question, value: any): string | null {
  const v = question.validation
  const isEmpty =
    value === undefined ||
    value === null ||
    (Array.isArray(value) ? value.length === 0 : String(value).trim() === "")
  if (isEmpty) return null

  const str = Array.isArray(value) ? value.join(", ") : String(value)

  // Built-in formats apply to email/phone question types even without explicit rules.
  if (question.questionType === "email" || v?.format === "email") {
    if (!EMAIL_RE.test(str)) return "Enter a valid email address."
  }
  if (question.questionType === "phone" || v?.format === "phone") {
    if (!PHONE_RE.test(str)) return "Enter a valid phone number."
  }

  if (!v) return null

  if (v.minLength != null && str.length < v.minLength) {
    return `Must be at least ${v.minLength} characters.`
  }
  if (v.maxLength != null && str.length > v.maxLength) {
    return `Must be at most ${v.maxLength} characters.`
  }

  if (v.min != null || v.max != null) {
    const num = Number(str)
    if (Number.isNaN(num)) return "Enter a valid number."
    if (v.min != null && num < v.min) return `Must be at least ${v.min}.`
    if (v.max != null && num > v.max) return `Must be at most ${v.max}.`
  }

  if (v.pattern) {
    try {
      if (!new RegExp(v.pattern).test(str)) {
        return v.patternMessage || "This answer is not in the expected format."
      }
    } catch {
      // An invalid author-supplied regex should never block a respondent.
    }
  }

  return null
}
```

### Step 3 — Add the collapsible Validation section (`frontend/src/components/QuestionCard.tsx`)
**Find** (imports):
```ts
import { Trash2, GripVertical, Plus } from "lucide-react"
import { Question, QuestionType } from "@/types"
```
**Replace with**:
```ts
import { Trash2, GripVertical, Plus, SlidersHorizontal, ChevronDown } from "lucide-react"
import { Question, QuestionType, QuestionValidation } from "@/types"
import { useState } from "react"
```

**Find** (the component body opener and `handleTypeChange`):
```ts
export function QuestionCard({ question, onUpdate, onDelete }: QuestionCardProps) {
  const handleTypeChange = (value: string | null) => {
    if (value) {
      onUpdate(question.questionId, { questionType: value as QuestionType })
    }
  }
```
**Replace with**:
```ts
export function QuestionCard({ question, onUpdate, onDelete }: QuestionCardProps) {
  const [showValidation, setShowValidation] = useState(false)

  const handleTypeChange = (value: string | null) => {
    if (value) {
      onUpdate(question.questionId, { questionType: value as QuestionType })
    }
  }

  // Merge a partial validation patch; drop empty-string/NaN values so we don't
  // persist `{ minLength: NaN }`.
  const updateValidation = (patch: Partial<QuestionValidation>) => {
    const next: QuestionValidation = { ...(question.validation || {}), ...patch }
    for (const key of Object.keys(next) as (keyof QuestionValidation)[]) {
      const val = next[key]
      if (val === "" || val === undefined || (typeof val === "number" && Number.isNaN(val))) {
        delete next[key]
      }
    }
    onUpdate(question.questionId, { validation: Object.keys(next).length ? next : undefined })
  }

  const numFromInput = (raw: string): number | undefined =>
    raw === "" ? undefined : Number(raw)

  const isTextType = ["short_answer", "long_answer"].includes(question.questionType)
  const isNumberType = question.questionType === "number"
```

**Find** (the Required switch + closing divs — the last block before the card closes):
```tsx
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-red-400" onClick={() => onDelete(question.questionId)}>
            <Trash2 size={18} />
          </Button>
          <div className="flex items-center space-x-2">
            <Label htmlFor={`required-${question.questionId}`} className="text-slate-400 text-sm">Required</Label>
            <Switch 
              id={`required-${question.questionId}`} 
              checked={question.isRequired} 
              onCheckedChange={(checked: boolean) => onUpdate(question.questionId, { isRequired: checked })}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
```
**Replace with**:
```tsx
        {/* Collapsible validation rules */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowValidation((s) => !s)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
          >
            <SlidersHorizontal size={13} />
            Validation
            <ChevronDown
              size={14}
              className={`transition-transform ${showValidation ? "rotate-180" : ""}`}
            />
          </button>

          {showValidation && (
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              {isTextType && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Min length</Label>
                    <Input
                      type="number"
                      min={0}
                      value={question.validation?.minLength ?? ""}
                      onChange={(e) => updateValidation({ minLength: numFromInput(e.target.value) })}
                      className="h-8 bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Max length</Label>
                    <Input
                      type="number"
                      min={0}
                      value={question.validation?.maxLength ?? ""}
                      onChange={(e) => updateValidation({ maxLength: numFromInput(e.target.value) })}
                      className="h-8 bg-slate-950 border-slate-800"
                    />
                  </div>
                </>
              )}

              {isNumberType && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Min value</Label>
                    <Input
                      type="number"
                      value={question.validation?.min ?? ""}
                      onChange={(e) => updateValidation({ min: numFromInput(e.target.value) })}
                      className="h-8 bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Max value</Label>
                    <Input
                      type="number"
                      value={question.validation?.max ?? ""}
                      onChange={(e) => updateValidation({ max: numFromInput(e.target.value) })}
                      className="h-8 bg-slate-950 border-slate-800"
                    />
                  </div>
                </>
              )}

              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Regex pattern (optional)</Label>
                <Input
                  value={question.validation?.pattern ?? ""}
                  onChange={(e) => updateValidation({ pattern: e.target.value })}
                  placeholder="e.g. ^[A-Z]{2}\\d{4}$"
                  className="h-8 bg-slate-950 border-slate-800 font-mono text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Custom error message (optional)</Label>
                <Input
                  value={question.validation?.patternMessage ?? ""}
                  onChange={(e) => updateValidation({ patternMessage: e.target.value })}
                  placeholder="Shown when the pattern doesn't match"
                  className="h-8 bg-slate-950 border-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-red-400" onClick={() => onDelete(question.questionId)}>
            <Trash2 size={18} />
          </Button>
          <div className="flex items-center space-x-2">
            <Label htmlFor={`required-${question.questionId}`} className="text-slate-400 text-sm">Required</Label>
            <Switch 
              id={`required-${question.questionId}`} 
              checked={question.isRequired} 
              onCheckedChange={(checked: boolean) => onUpdate(question.questionId, { isRequired: checked })}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
```

### Step 4 — Enforce validation on the public form (`frontend/src/app/f/[token]/page.tsx`)
The current page tracks `errors` as `Record<string, boolean>`. Switch it to `Record<string, string>` so it can hold per-question messages (required vs. format).

**Find** (imports):
```ts
import { FormRenderer } from "@/components/FormRenderer"
```
**Replace with**:
```ts
import { FormRenderer, validateAnswer } from "@/components/FormRenderer"
```

**Find**:
```ts
  const [errors, setErrors] = useState<Record<string, boolean>>({})
```
**Replace with**:
```ts
  const [errors, setErrors] = useState<Record<string, string>>({})
```

**Find** (the submit validation block):
```ts
    // Enforce required questions (the `*` was previously cosmetic only).
    const missing = form!.questions.filter(q => {
      if (!q.isRequired) return false
      const v = responses[q.questionId]
      if (Array.isArray(v)) return v.length === 0
      return !v || String(v).trim() === ""
    })
    if (missing.length > 0) {
      setErrors(Object.fromEntries(missing.map(m => [m.questionId, true])))
      // Bring the first unanswered question into view rather than blocking on a dialog.
      document.getElementById(`q-${missing[0].questionId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      return
    }
    setErrors({})
```
**Replace with**:
```ts
    // Required + per-question validation in one pass, preserving order so the
    // "scroll to first error" lands on the topmost problem.
    const fieldErrors: Record<string, string> = {}
    for (const q of form!.questions) {
      const v = responses[q.questionId]
      const isEmpty = Array.isArray(v) ? v.length === 0 : !v || String(v).trim() === ""
      if (q.isRequired && isEmpty) {
        fieldErrors[q.questionId] = "This question is required."
        continue
      }
      const ruleError = validateAnswer(q, v)
      if (ruleError) fieldErrors[q.questionId] = ruleError
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      const firstId = form!.questions.find(q => fieldErrors[q.questionId])?.questionId
      if (firstId) {
        document.getElementById(`q-${firstId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      }
      return
    }
    setErrors({})
```

**Find** (the inline error render):
```tsx
              {errors[q.questionId] && (
                <p role="alert" className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  This question is required.
                </p>
              )}
```
**Replace with**:
```tsx
              {errors[q.questionId] && (
                <p role="alert" className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errors[q.questionId]}
                </p>
              )}
```

> Note: `handleAnswerChange` already deletes the error key on change via `if (!prev[questionId]) return prev`. With the value now a string, `!prev[questionId]` is still correctly falsy for the missing case, so no change is needed there.

### Step 5 — Add `validation` to the Mongoose schema (`backend/src/models/form.model.ts`)
**Find**:
```ts
export interface IQuestion {
  questionId: string;
  questionText: string;
  questionType: string;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
}
```
**Replace with**:
```ts
export interface IQuestionValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  format?: 'email' | 'phone';
}

export interface IQuestion {
  questionId: string;
  questionText: string;
  questionType: string;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
  validation?: IQuestionValidation;
}
```

**Find**:
```ts
const QuestionSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  questionType: { type: String, required: true },
  options: [{ type: String }],
  isRequired: { type: Boolean, default: false },
  orderIndex: { type: Number, required: true }
});
```
**Replace with**:
```ts
const ValidationSchema = new Schema({
  minLength: { type: Number },
  maxLength: { type: Number },
  min: { type: Number },
  max: { type: Number },
  pattern: { type: String },
  patternMessage: { type: String },
  format: { type: String, enum: ['email', 'phone'] }
}, { _id: false });

const QuestionSchema = new Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  questionType: { type: String, required: true },
  options: [{ type: String }],
  isRequired: { type: Boolean, default: false },
  orderIndex: { type: Number, required: true },
  validation: { type: ValidationSchema, default: undefined }
});
```

### Step 6 — Server-side enforcement in `submitResponse` (`backend/src/controllers/responses.controller.ts`)
**Find** (the required-questions block):
```ts
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
```
**Replace with**:
```ts
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
```

## Edge cases & notes
- Validation rules only apply to non-empty answers; "required" is the separate gate (don't double-report).
- `updateValidation` strips empty values, so toggling fields off cleanly removes the rule and can clear `validation` back to `undefined` (keeps stored docs lean).
- Min/max length only surface for text types; min/max value only for number type — but the regex/format fields apply to any type.
- An invalid author-supplied regex is swallowed on both client and server so it never blocks a respondent.
- The `validation` schema uses `{ _id: false }` so embedded validation objects don't get spurious `_id`s.
- `updateForm` uses `$set` with the full body; `validation` rides along automatically (it is not in `PROTECTED_FIELDS`).

## Verification
- `cd frontend && rtk tsc` (expect no errors).
- `cd backend && rtk tsc --noEmit`.
- Manual: open a form in the editor, expand "Validation" on a short-answer question, set Min length 5; on a number question set Min 1 / Max 10; on a question add a regex. Save. Open the public link, submit a too-short answer / out-of-range number / non-matching pattern → inline red messages appear and scroll targets the first error. Fix values → submit succeeds.
- Bypass test: POST directly to `/api/f/:token/submit` with a too-short answer → expect HTTP 400 with `questionIds`.
