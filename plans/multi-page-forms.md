# Multi-Page Forms

> Status: Not started. Effort: M. Area: Form building & UX.

## Goal
Split long public forms into steps with a progress bar. Add an optional `pageBreak` boolean to questions (simplest model — a break *before* a question starts a new page). Rework the public form (`f/[token]/page.tsx`) to paginate: a `currentStep` state with Next/Back navigation, a progress bar, per-step required/validation checks, and a single final submit. Authors mark page breaks via a toggle in `QuestionCard.tsx`.

## Why `pageBreak` (not a `sections` array)
A boolean flag on existing questions needs no new schema relationships, survives drag-reorder (the flag travels with its question), and degrades gracefully — a form with zero page breaks renders as one page exactly like today. A separate `sections` model would require migrating existing forms and re-associating questions. Keep it simple.

## Dependencies to install
None.

## Files touched
- `frontend/src/types/index.ts` — edit — add `pageBreak?` to `Question`.
- `backend/src/models/form.model.ts` — edit — add `pageBreak` to `QuestionSchema` + `IQuestion`.
- `frontend/src/components/QuestionCard.tsx` — edit — add a "Start new page here" toggle.
- `frontend/src/app/f/[token]/page.tsx` — edit — paginate, progress bar, per-step validation.

## Step-by-step

### Step 1 — Add `pageBreak` to the type (`frontend/src/types/index.ts`)
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
export interface Question {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
  pageBreak?: boolean;
}
```

### Step 2 — Add `pageBreak` to the Mongoose schema (`backend/src/models/form.model.ts`)
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
export interface IQuestion {
  questionId: string;
  questionText: string;
  questionType: string;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
  pageBreak?: boolean;
}
```

**Find**:
```ts
  isRequired: { type: Boolean, default: false },
  orderIndex: { type: Number, required: true }
});
```
**Replace with**:
```ts
  isRequired: { type: Boolean, default: false },
  orderIndex: { type: Number, required: true },
  pageBreak: { type: Boolean, default: false }
});
```

### Step 3 — Add a page-break toggle to `QuestionCard` (`frontend/src/components/QuestionCard.tsx`)
**Find** (imports):
```ts
import { Trash2, GripVertical, Plus } from "lucide-react"
```
**Replace with**:
```ts
import { Trash2, GripVertical, Plus, SeparatorHorizontal } from "lucide-react"
```

**Find** (the footer row with delete + Required switch):
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
```
**Replace with**:
```tsx
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-red-400" onClick={() => onDelete(question.questionId)}>
            <Trash2 size={18} />
          </Button>
          <div className="flex items-center gap-5">
            <div className="flex items-center space-x-2">
              <Label htmlFor={`pagebreak-${question.questionId}`} className="flex items-center gap-1 text-slate-400 text-sm">
                <SeparatorHorizontal size={14} />
                New page
              </Label>
              <Switch
                id={`pagebreak-${question.questionId}`}
                checked={!!question.pageBreak}
                onCheckedChange={(checked: boolean) => onUpdate(question.questionId, { pageBreak: checked })}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>
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
```

### Step 4 — Paginate the public form (`frontend/src/app/f/[token]/page.tsx`)

**4a — imports & state.** Add `useMemo`, navigation icons, and `currentStep`.
**Find**:
```ts
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Form, Answer } from "@/types"
import api from "@/lib/api"
import { FormRenderer } from "@/components/FormRenderer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
```
**Replace with**:
```ts
import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { Form, Answer, Question } from "@/types"
import api from "@/lib/api"
import { FormRenderer } from "@/components/FormRenderer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft } from "lucide-react"
```

**Find**:
```ts
  const [submitting, setSubmitting] = useState(false)
```
**Replace with**:
```ts
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
```

**4b — derive pages.** Add a memo that groups the sorted questions into pages split on `pageBreak`. Place it after `if (!form) return null` so `form` is non-null.
**Find**:
```ts
  if (!form) return null

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-extrabold text-white text-balance">
            {form.title}
          </h1>
          {form.description && <p className="text-slate-400 text-lg leading-relaxed">{form.description}</p>}
        </div>
```
**Replace with**:
```ts
  if (!form) return null

  // Group sorted questions into pages. A question with pageBreak=true starts a
  // new page. No breaks → a single page (identical to the old single-page form).
  const sorted = [...form.questions].sort((a, b) => a.orderIndex - b.orderIndex)
  const pages: Question[][] = sorted.reduce<Question[][]>((acc, q) => {
    if (acc.length === 0 || q.pageBreak) {
      acc.push([q])
    } else {
      acc[acc.length - 1].push(q)
    }
    return acc
  }, [])
  const totalSteps = Math.max(pages.length, 1)
  const safeStep = Math.min(currentStep, totalSteps - 1)
  const isLastStep = safeStep >= totalSteps - 1
  const currentQuestions = pages[safeStep] || []
  const progressPct = totalSteps <= 1 ? 100 : Math.round(((safeStep + 1) / totalSteps) * 100)

  // Validate only the questions on the current page; returns true if OK.
  const validateStep = (questions: Question[]) => {
    const missing = questions.filter(q => {
      if (!q.isRequired) return false
      const v = responses[q.questionId]
      if (Array.isArray(v)) return v.length === 0
      return !v || String(v).trim() === ""
    })
    if (missing.length > 0) {
      setErrors(Object.fromEntries(missing.map(m => [m.questionId, true])))
      document.getElementById(`q-${missing[0].questionId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      return false
    }
    return true
  }

  const goNext = () => {
    if (!validateStep(currentQuestions)) return
    setErrors({})
    setCurrentStep(s => Math.min(s + 1, totalSteps - 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const goBack = () => {
    setCurrentStep(s => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {totalSteps > 1 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Step {safeStep + 1} of {totalSteps}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-extrabold text-white text-balance">
            {form.title}
          </h1>
          {form.description && <p className="text-slate-400 text-lg leading-relaxed">{form.description}</p>}
        </div>
```

**4c — gate the submit handler to require the last step.** The existing `handleSubmit` validates ALL questions, which still works as the final guard. Add an early guard so a stray Enter on an earlier step advances instead of submitting.
**Find**:
```ts
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
```
**Replace with**:
```ts
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    // Guard: only the final step submits. On earlier steps, advance instead.
    if (!isLastStepRef.current) {
      goNextRef.current?.()
      return
    }
```
> Because `isLastStep`/`goNext` are computed below the handler in render scope, expose them via refs. Add these refs near the other `useState` calls:
> **Find**:
> ```ts
>   const [currentStep, setCurrentStep] = useState(0)
> ```
> **Replace with**:
> ```ts
>   const [currentStep, setCurrentStep] = useState(0)
>   const isLastStepRef = useRef(true)
>   const goNextRef = useRef<(() => void) | null>(null)
> ```
> and add `useRef` to the React import on line 3 (`import { useState, useEffect, useMemo, useRef } from "react"`).
> Then, just before the `return (` in render, sync the refs:
> ```ts
>   isLastStepRef.current = isLastStep
>   goNextRef.current = goNext
> ```
> (Place these two lines immediately after `const progressPct = ...` and before `const validateStep`.)

**4d — render only the current page's questions + step nav.** Replace the full questions map and the single submit button.
**Find**:
```tsx
          {/* Questions Section */}
          {[...form.questions].sort((a, b) => a.orderIndex - b.orderIndex).map((q) => (
            <div key={q.questionId} id={`q-${q.questionId}`} className="space-y-4 scroll-mt-24">
              <Label className="text-lg font-semibold flex items-start gap-1">
                {q.questionText}
                {q.isRequired && <span className="text-red-400 font-bold" aria-hidden="true">*</span>}
              </Label>
              <FormRenderer
                question={q}
                value={responses[q.questionId] || ""}
                onChange={(val) => handleAnswerChange(q.questionId, val)}
              />
              {errors[q.questionId] && (
                <p role="alert" className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  This question is required.
                </p>
              )}
            </div>
          ))}

          <div className="space-y-3">
            {submitError && (
              <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {submitError}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 transition-all font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Response"
              )}
            </Button>
          </div>
```
**Replace with**:
```tsx
          {/* Questions for the current step only */}
          {currentQuestions.map((q) => (
            <div key={q.questionId} id={`q-${q.questionId}`} className="space-y-4 scroll-mt-24">
              <Label className="text-lg font-semibold flex items-start gap-1">
                {q.questionText}
                {q.isRequired && <span className="text-red-400 font-bold" aria-hidden="true">*</span>}
              </Label>
              <FormRenderer
                question={q}
                value={responses[q.questionId] || ""}
                onChange={(val) => handleAnswerChange(q.questionId, val)}
              />
              {errors[q.questionId] && (
                <p role="alert" className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  This question is required.
                </p>
              )}
            </div>
          ))}

          <div className="space-y-3">
            {submitError && (
              <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {submitError}
              </p>
            )}
            <div className="flex items-center gap-3">
              {safeStep > 0 && (
                <Button
                  type="button"
                  onClick={goBack}
                  variant="outline"
                  className="h-14 px-6 text-lg border-slate-700 bg-transparent"
                >
                  <ArrowLeft className="h-5 w-5 mr-1" />
                  Back
                </Button>
              )}
              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="flex-1 h-14 text-lg bg-indigo-600 hover:bg-indigo-700 transition-all font-bold"
                >
                  Next
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-14 text-lg bg-indigo-600 hover:bg-indigo-700 transition-all font-bold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit Response"
                  )}
                </Button>
              )}
            </div>
          </div>
```

> The Personal Info `Card` block stays where it is — it renders on every step. If you prefer it only on step 0, wrap its outer `{(form.collectFullName || …) && (` condition with `safeStep === 0 && (...)`. Recommended: keep it on step 0 only to avoid re-rendering required native inputs that lose focus state across steps — change the guard to `safeStep === 0 && (form.collectFullName || form.collectEmail || form.collectPhone || form.collectAge || form.collectDateOfBirth || form.collectGender) && (`.

## Edge cases & notes
- A form with no `pageBreak` flags produces exactly one page → renders identically to today (Back/Next hidden, progress bar hidden).
- The first question's `pageBreak` is ignored implicitly: the reduce starts a fresh page on the first item regardless, so a leading break doesn't create an empty page.
- Per-step validation only checks the current page's required questions; the existing all-questions check in `handleSubmit` remains the final guard (and the server still enforces required + any validation rules).
- Native required Personal Info inputs are uncontrolled (`onChange` only) — keeping them on step 0 avoids losing their values when other steps mount/unmount.
- `responses` persists across steps (single state object keyed by questionId), so going Back keeps prior answers.
- Backend needs no logic change beyond storing `pageBreak`; submission still sends all answers at once.

## Verification
- `cd frontend && rtk tsc`.
- `cd backend && rtk tsc --noEmit`.
- Manual: in the editor toggle "New page" on the 3rd and 5th questions, Save. Open the public link → progress bar + "Step 1 of 3", only the first group shows. Leave a required field empty, click Next → inline error, blocked. Fill it, Next → step 2. Back → answers retained. On the last step the button reads "Submit Response" and posts all answers.
