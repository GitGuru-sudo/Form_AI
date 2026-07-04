# Responses Dashboard — Per-Question Summary Charts

> Status: Not started. Effort: M. Area: Responses & analytics.

## Goal
Add a "Summary" view to the responses page that aggregates the already-fetched `/responses` data per question and renders charts: bar/pie for `multiple_choice`/`checkbox`/`dropdown`/`yes_no`, a histogram for `rating`/`linear_scale`/`number`, and a top-word / answer-list for free-text questions. Aggregation is done **client-side** from the existing responses array — no new backend endpoint — and the page gains an "Individual / Summary" tab toggle.

## Dependencies to install
```bash
cd frontend && npm i recharts --legacy-peer-deps
```
(recharts 2.x is React-18 compatible; no `@types` needed — it ships its own types.)

## Files touched
- `frontend/src/components/ResponsesCharts.tsx` — new — the summary/charts component (aggregation + recharts rendering).
- `frontend/src/app/forms/[id]/responses/page.tsx` — edit — add a tab toggle and mount `ResponsesCharts` in summary mode.

## Approach (chosen vs. alternative)
**Chosen: client-side aggregation.** The page already fetches the full `responses` array and `form` (with `questions`). Aggregating in the browser is zero new backend surface, zero new auth, and the dataset per form is small (hundreds–low-thousands of rows). Answers are stored as a single `answerText` string; `checkbox` answers are joined with `", "` on submit (see `submitResponse` normalize logic), so we split on `", "` to recover multi-select counts.

**Alternative (scale option, not implemented now): a backend aggregate endpoint** `GET /api/forms/:id/responses/summary` using a Mongo `$unwind: '$answers'` + `$group` pipeline. Only worth it if a single form accumulates tens of thousands of responses and you want to avoid shipping them all to the client. Sketch is in *Edge cases & notes*.

## Step-by-step

### Step 1 — Create the charts component (`frontend/src/components/ResponsesCharts.tsx`)
Create `frontend/src/components/ResponsesCharts.tsx` with full contents:
```tsx
"use client"

import { useMemo } from "react"
import { Form, FormResponse } from "@/types"
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"

// Question types whose answers are categorical (counted by distinct value).
const CHOICE_TYPES = new Set(["multiple_choice", "checkbox", "dropdown", "yes_no"])
// Question types whose answers are numeric buckets (histogram).
const NUMERIC_TYPES = new Set(["rating", "linear_scale", "number"])

// Dark-theme palette (indigo-led) reused for every series/slice.
const COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#4f46e5", "#7c3aed", "#22d3ee", "#34d399", "#f59e0b"]

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "is", "are",
  "was", "were", "be", "i", "it", "this", "that", "with", "as", "at", "by", "my",
])

interface AggBucket { label: string; count: number }

function aggregateChoice(responses: FormResponse[], questionId: string): AggBucket[] {
  const counts = new Map<string, number>()
  for (const r of responses) {
    const ans = r.answers.find(a => a.questionId === questionId)
    if (!ans || !ans.answerText.trim()) continue
    // checkbox answers were stored as "A, B, C" — split them back out.
    for (const part of ans.answerText.split(", ")) {
      const label = part.trim()
      if (!label) continue
      counts.set(label, (counts.get(label) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

function aggregateNumeric(responses: FormResponse[], questionId: string): AggBucket[] {
  const counts = new Map<string, number>()
  for (const r of responses) {
    const ans = r.answers.find(a => a.questionId === questionId)
    if (!ans || !ans.answerText.trim()) continue
    const n = Number(ans.answerText.trim())
    if (Number.isNaN(n)) continue
    const key = String(n)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => Number(a.label) - Number(b.label))
}

function aggregateText(responses: FormResponse[], questionId: string) {
  const answers: string[] = []
  const wordCounts = new Map<string, number>()
  for (const r of responses) {
    const ans = r.answers.find(a => a.questionId === questionId)
    if (!ans || !ans.answerText.trim()) continue
    answers.push(ans.answerText.trim())
    for (const w of ans.answerText.toLowerCase().match(/[a-z0-9']+/g) || []) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1)
    }
  }
  const topWords = [...wordCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
  return { answers, topWords }
}

function ChartCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="text-xs text-slate-500">{count} answered</span>
      </div>
      {children}
    </div>
  )
}

function ChoiceChart({ data }: { data: AggBucket[] }) {
  // Pie when few categories, horizontal bar when many.
  const total = data.reduce((s, d) => s + d.count, 0)
  if (data.length <= 6) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={45} outerRadius={80} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff" }} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="flex-1 space-y-2 text-sm w-full">
          {data.map((d, i) => (
            <li key={d.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-slate-300 flex-1 truncate">{d.label}</span>
              <span className="text-slate-500">{d.count} ({total ? Math.round((d.count / total) * 100) : 0}%)</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
        <YAxis type="category" dataKey="label" stroke="#94a3b8" fontSize={12} width={140} />
        <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff" }} />
        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function HistogramChart({ data }: { data: AggBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
        <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff" }} />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function TextSummary({ topWords, answers }: { topWords: AggBucket[]; answers: string[] }) {
  const maxWord = topWords[0]?.count || 1
  return (
    <div className="space-y-4">
      {topWords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topWords.map(w => (
            <span
              key={w.label}
              className="rounded-full bg-indigo-600/15 text-indigo-300 px-3 py-1 border border-indigo-600/20"
              style={{ fontSize: `${0.75 + (w.count / maxWord) * 0.5}rem` }}
            >
              {w.label} <span className="text-indigo-400/60">{w.count}</span>
            </span>
          ))}
        </div>
      )}
      <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
        {answers.slice(0, 50).map((a, i) => (
          <li key={i} className="text-slate-300 border-l-2 border-slate-800 pl-3 whitespace-pre-wrap">{a}</li>
        ))}
        {answers.length > 50 && (
          <li className="text-slate-500 text-xs pl-3">+{answers.length - 50} more…</li>
        )}
      </ul>
    </div>
  )
}

export function ResponsesCharts({ form, responses }: { form: Form; responses: FormResponse[] }) {
  const sortedQuestions = useMemo(
    () => [...form.questions].sort((a, b) => a.orderIndex - b.orderIndex),
    [form.questions]
  )

  if (responses.length === 0) {
    return (
      <div className="text-center py-24 text-slate-400">
        <p className="text-lg">Nothing to summarise yet.</p>
        <p className="text-sm mt-1">Charts appear once responses come in.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedQuestions.map(q => {
        if (CHOICE_TYPES.has(q.questionType)) {
          const data = aggregateChoice(responses, q.questionId)
          const answered = responses.filter(r => r.answers.some(a => a.questionId === q.questionId && a.answerText.trim())).length
          return (
            <ChartCard key={q.questionId} title={q.questionText} count={answered}>
              {data.length ? <ChoiceChart data={data} /> : <p className="text-slate-500 text-sm">No answers.</p>}
            </ChartCard>
          )
        }
        if (NUMERIC_TYPES.has(q.questionType)) {
          const data = aggregateNumeric(responses, q.questionId)
          const answered = data.reduce((s, d) => s + d.count, 0)
          return (
            <ChartCard key={q.questionId} title={q.questionText} count={answered}>
              {data.length ? <HistogramChart data={data} /> : <p className="text-slate-500 text-sm">No numeric answers.</p>}
            </ChartCard>
          )
        }
        // Everything else (short_answer, long_answer, email, phone, date, time, file_upload) → text summary.
        const { topWords, answers } = aggregateText(responses, q.questionId)
        return (
          <ChartCard key={q.questionId} title={q.questionText} count={answers.length}>
            {answers.length ? <TextSummary topWords={topWords} answers={answers} /> : <p className="text-slate-500 text-sm">No answers.</p>}
          </ChartCard>
        )
      })}
    </div>
  )
}
```

### Step 2 — Add a view toggle + mount the summary view (`frontend/src/app/forms/[id]/responses/page.tsx`)

**Find** (imports block):
```tsx
import { Download, ArrowLeft, Edit3 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
```
**Replace with**:
```tsx
import { Download, ArrowLeft, Edit3, List, BarChart3 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { ResponsesCharts } from "@/components/ResponsesCharts"
```

**Find** (state declarations):
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
  const [view, setView] = useState<"individual" | "summary">("individual")
```

**Find** (the header sub-line that shows the response count — add the toggle right under it). Locate:
```tsx
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{form.title}</h1>
              <p className="text-slate-400">{responses.length} response{responses.length !== 1 ? "s" : ""}</p>
            </div>
```
**Replace with**:
```tsx
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{form.title}</h1>
              <p className="text-slate-400">{responses.length} response{responses.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1">
              <button
                onClick={() => setView("individual")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${view === "individual" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                <List className="h-4 w-4" /> Individual
              </button>
              <button
                onClick={() => setView("summary")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${view === "summary" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                <BarChart3 className="h-4 w-4" /> Summary
              </button>
            </div>
```

**Find** (the responses body — the empty-state + individual cards block):
```tsx
          {responses.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <p className="text-lg">No responses yet.</p>
              <p className="text-sm mt-1">Share the form link to start collecting responses.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((res) => (
```
**Replace with**:
```tsx
          {responses.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <p className="text-lg">No responses yet.</p>
              <p className="text-sm mt-1">Share the form link to start collecting responses.</p>
            </div>
          ) : view === "summary" ? (
            <ResponsesCharts form={form} responses={responses} />
          ) : (
            <div className="space-y-4">
              {responses.map((res) => (
```
(The rest of the `individual` card markup and its two closing `</div>` + `)}` stay exactly as they are.)

## Edge cases & notes
- **checkbox split fidelity**: answers are stored joined by `", "`. If an option label itself contains `", "`, the split mis-counts. Acceptable for v1; the form builder rarely produces such labels.
- **Numeric histogram** treats each distinct value as a bucket (good for ratings 1–5 / linear scales). For free `number` questions with high cardinality this can be wide — recharts still renders, just scrollable. A true binned histogram is a later refinement.
- **`yes_no`** is treated as choice; values come through as whatever the renderer submits ("Yes"/"No").
- recharts pulls in d3 — first `next build` after install is slightly slower; bundle impact is on this route only (component is client-only and route-scoped).
- **Optional backend aggregate** (scale path): add to `responses.controller.ts` a `getResponsesSummary` that runs:
  ```ts
  ResponseModel.aggregate([
    { $match: { formId: new mongoose.Types.ObjectId(id) } },
    { $unwind: '$answers' },
    { $group: { _id: { qid: '$answers.questionId', val: '$answers.answerText' }, count: { $sum: 1 } } },
  ])
  ```
  mounted as `router.get('/forms/:id/responses/summary', requireAuth, responsesController.getResponsesSummary)` in `responses.routes.ts`. Then have `ResponsesCharts` accept pre-aggregated buckets instead of raw responses. Skip unless data volume demands it.

## Verification
- `cd frontend && rtk tsc` — no type errors (recharts types resolve; `view` union is exhaustive).
- `cd frontend && rtk next build` — route `/forms/[id]/responses` compiles (ESLint ignored, build is the truth).
- Manual: open a form with responses → click **Summary**. Choice questions show pie/legend (≤6 options) or horizontal bars (>6); rating/number show a histogram; text questions show a word-frequency cloud + answer list. Toggle back to **Individual** to confirm cards still render.
