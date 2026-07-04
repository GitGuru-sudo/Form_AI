# Response Filtering & Search

> Status: Not started. Effort: S. Area: Responses & analytics.

## Goal
Let the form owner narrow the responses list by a date range and a free-text query that matches across all answer text and personal-info fields. Done **client-side** over the already-fetched `responses` array (instant, no new requests). A server-side query-param variant is described as a scale option.

## Dependencies to install
None. (`date-fns` is already a frontend dependency if needed, but the plain `Date` comparisons below avoid it entirely.)

## Files touched
- `frontend/src/app/forms/[id]/responses/page.tsx` — edit — add filter state, a `useMemo` filter, a filter-bar UI, and render the filtered list.

## Step-by-step

### Step 1 — Add icons + filter state (`frontend/src/app/forms/[id]/responses/page.tsx`)

**Find** (imports):
```tsx
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import { Form, FormResponse } from "@/types"
```
**Replace with**:
```tsx
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect, useMemo } from "react"
import { Form, FormResponse } from "@/types"
```

**Find** (the lucide import line):
```tsx
import { Download, ArrowLeft, Edit3 } from "lucide-react"
```
**Replace with**:
```tsx
import { Download, ArrowLeft, Edit3, Search, X } from "lucide-react"
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
  const [query, setQuery] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  // Filtered view derived from raw responses + the three filter inputs.
  const filteredResponses = useMemo(() => {
    const q = query.trim().toLowerCase()
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    // Include the entire "to" day by pushing to its end.
    const toTs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null

    return responses.filter(r => {
      const ts = new Date(r.submittedAt).getTime()
      if (fromTs !== null && ts < fromTs) return false
      if (toTs !== null && ts > toTs) return false
      if (!q) return true

      // Search across personal info + every answer's text.
      const haystack = [
        r.respondentName, r.respondentEmail, r.respondentPhone,
        r.respondentGender,
        r.respondentAge != null ? String(r.respondentAge) : "",
        ...r.answers.map(a => a.answerText),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [responses, query, fromDate, toDate])

  const filtersActive = query.trim() !== "" || fromDate !== "" || toDate !== ""
```

### Step 2 — Add the filter bar UI (`frontend/src/app/forms/[id]/responses/page.tsx`)

**Find** (the header sub-line — insert the filter bar after the closing `</div>` of the header flex row, i.e. right before the responses body conditional):
```tsx
            <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700">
              <Download className="mr-2 h-4 w-4" /> Download Excel
            </Button>
          </div>

          {responses.length === 0 ? (
```
**Replace with**:
```tsx
            <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700">
              <Download className="mr-2 h-4 w-4" /> Download Excel
            </Button>
          </div>

          {responses.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search answers, name, email…"
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-600 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-600 transition-colors [color-scheme:dark]"
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-600 transition-colors [color-scheme:dark]"
                />
              </div>
              {filtersActive && (
                <button
                  onClick={() => { setQuery(""); setFromDate(""); setToDate("") }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" /> Clear
                </button>
              )}
            </div>
          )}

          {filtersActive && (
            <p className="text-sm text-slate-400 mb-4">
              Showing {filteredResponses.length} of {responses.length} responses
            </p>
          )}

          {responses.length === 0 ? (
```

### Step 3 — Render the filtered list instead of all responses

**Find** (the start of the populated branch):
```tsx
          ) : (
            <div className="space-y-4">
              {responses.map((res) => (
```
**Replace with**:
```tsx
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <p className="text-lg">No responses match your filters.</p>
              <p className="text-sm mt-1">Try a different search term or date range.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResponses.map((res) => (
```
> Only the `.map` source changes (`responses` → `filteredResponses`) plus the new "no match" branch. The card markup inside the map is untouched.

## Edge cases & notes
- **Date inputs use `<input type="date">`** (value `YYYY-MM-DD`). `[color-scheme:dark]` makes the native calendar/icon render dark to match the UI.
- **Inclusive `to` date**: the `to` bound is pushed to `23:59:59.999` so selecting the same from/to day shows that whole day.
- **Search scope**: matches personal info + answer text (case-insensitive substring). It does **not** match question text — owners search what respondents *said*, not the question labels. Easy to extend by adding `...r.answers.map(a => a.questionText)` to the haystack.
- **Composes with other plans**: if the Summary/charts plan is also applied, point `ResponsesCharts` at `filteredResponses` instead of `responses` to make charts respect the filters too. If the realtime plan is applied, filtering re-runs automatically on each poll because it's a `useMemo` over `responses`.
- **Native inputs over `ui/input`**: plain inputs are used to keep the filter bar self-contained and avoid styling the date picker through the component; both match the dark/indigo palette.

### Scale option: server-side filtering (not implemented)
For forms with very large response counts, push filtering to the API:
- `getResponses` accepts `?q=&from=&to=` query params.
- Date range → `submittedAt: { $gte, $lte }` on the existing `{ formId, submittedAt }` index.
- Text → either a regex `$or` across `answers.answerText` + personal fields, or a Mongo text index for relevance. Add pagination (`?page=&limit=`) at the same time.
- Frontend debounces `query`/dates and refetches. Only worth it past a few thousand responses per form; client-side is preferred until then.

## Verification
- `cd frontend && rtk tsc` then `rtk next build` — compiles; `filteredResponses`/`filtersActive` typed.
- Manual: open a form with several responses across different days. Type a word that appears in one answer → only matching cards remain and the "Showing X of Y" line updates. Set a from/to date → list narrows to that window. **Clear** resets all three. With 0 total responses the filter bar is hidden (existing empty state shows).
