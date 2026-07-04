# Question Types Expansion

> Status: Not started. Effort: M. Area: Form building & UX.

## Goal
Close the renderer gap: `linear_scale`, `time`, and `file_upload` are already valid `QuestionType` values and appear in the editor's `QUESTION_TYPES` list, but `FormRenderer.tsx` has no `case` for them, so they silently fall through to a plain text `Input`. Implement proper renderers for all three, and (stretch) add `matrix`/`ranking`/`signature` end-to-end. Backend stores `questionType` as a free `string`, so **no backend change is required** for new types.

## The 3-place rule
Any new question type must be coherent in three places or it breaks type-safety / UX:
1. `frontend/src/types/index.ts` — add to the `QuestionType` union.
2. `frontend/src/components/QuestionCard.tsx` — add to `QUESTION_TYPES` (and any options/config UI).
3. `frontend/src/components/FormRenderer.tsx` — add a `case`.

For the three MISSING cases (`linear_scale`, `time`, `file_upload`), steps 1 and 2 are **already done** — only the renderer `case` is missing. For the stretch types, all three places need edits.

## Dependencies to install
None for the three core cases (`<input type="range">`, `<input type="time">`, `<input type="file">` are native). Stretch `signature` can use a tiny canvas (no dep) — only add a library if you want polished smoothing.

## Files touched
- `frontend/src/components/FormRenderer.tsx` — edit — add the three missing `case`s (+ stretch cases).
- `frontend/src/types/index.ts` — edit — only if adding stretch types.
- `frontend/src/components/QuestionCard.tsx` — edit — only if adding stretch types / scale config UI.

## Step-by-step

### Step 1 — Add `linear_scale`, `time`, `file_upload` renderers (`frontend/src/components/FormRenderer.tsx`)
**Find** (the `date` / `number` cases — we insert the new cases right after `date`):
```tsx
    case "date":
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700 inv-color-scheme" />

    case "number":
```
**Replace with**:
```tsx
    case "date":
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700 inv-color-scheme" />

    case "linear_scale": {
      // Slider from min..max. Authors can override the range via the first two
      // options ("1".."10"); otherwise default to 1..10.
      const opts = question.options || []
      const min = Number(opts[0]) || 1
      const max = Number(opts[1]) || 10
      const current = value === "" || value == null ? min : Number(value)
      return (
        <div className="space-y-3">
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={current}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-indigo-600"
            aria-label={question.questionText}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={current}
          />
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>{min}</span>
            <span className="rounded-md bg-indigo-600/20 px-3 py-1 font-semibold text-indigo-300">
              {current}
            </span>
            <span>{max}</span>
          </div>
        </div>
      )
    }

    case "time":
      return <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700 inv-color-scheme" />

    case "file_upload":
      // METADATA-ONLY: with no storage backend, capture the chosen file name so
      // the answer text is meaningful, but do NOT upload bytes. See "File upload
      // storage" below for the real-upload path.
      return (
        <div className="space-y-2">
          <Input
            type="file"
            onChange={(e) => onChange(e.target.files?.[0]?.name || "")}
            className="bg-white/5 border-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-white"
            aria-label={question.questionText}
          />
          {value && <p className="text-xs text-slate-500">Selected: {value}</p>}
          <p className="text-xs text-slate-600">
            File name is recorded with your response. Do not upload sensitive documents.
          </p>
        </div>
      )

    case "number":
```

That is the entire required change. `linear_scale`, `time`, and `file_upload` now render correctly instead of falling through to the default text input.

## File upload storage
The renderer above is **metadata-only**: it records the selected file's name as the answer string (which serialises cleanly into the existing `answers[].answerText` string column and the Excel export). This is the recommended default because FormAI has no object storage configured and the response schema only stores strings.

If real file storage is needed later, two paths (pick one, out of scope for the core change):
- **Base64 small files (≤ ~1 MB):** read the file with `FileReader.readAsDataURL`, store the data URL in `answerText`. Cheap but bloats Mongo documents and the Excel export — gate hard on size.
- **S3 / UploadThing (stretch, real solution):** add an UploadThing/S3 presign endpoint on the backend, upload from the client, store the returned URL in `answerText`. Requires new backend routes + env keys; do not attempt without storage credentials.

Recommendation: ship metadata-only now; treat real uploads as a separate plan.

## Stretch types (optional, full 3-place wiring)
Only do this section if you want `matrix`, `ranking`, or `signature`. Each needs all three edits.

### Stretch A — Extend the union (`frontend/src/types/index.ts`)
**Find**:
```ts
  | "yes_no"
  | "file_upload";
```
**Replace with**:
```ts
  | "yes_no"
  | "file_upload"
  | "ranking"
  | "signature";
```
(Add `| "matrix"` too if implementing matrix.)

### Stretch B — Add to the editor list (`frontend/src/components/QuestionCard.tsx`)
**Find**:
```ts
  { value: "yes_no", label: "Yes/No Buttons" },
  { value: "file_upload", label: "File Upload" },
]
```
**Replace with**:
```ts
  { value: "yes_no", label: "Yes/No Buttons" },
  { value: "file_upload", label: "File Upload" },
  { value: "ranking", label: "Ranking (Order options)" },
  { value: "signature", label: "Signature" },
]
```
`ranking` reuses the existing options editor — extend the `showOptions` guard so authors can add the items to be ranked:
**Find**:
```ts
  const showOptions = ["multiple_choice", "checkbox", "dropdown"].includes(question.questionType)
```
**Replace with**:
```ts
  const showOptions = ["multiple_choice", "checkbox", "dropdown", "ranking"].includes(question.questionType)
```

### Stretch C — Renderers (`frontend/src/components/FormRenderer.tsx`)
Insert these cases right before `default:`.
**Find**:
```tsx
    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700" />
```
**Replace with**:
```tsx
    case "ranking": {
      // Value is an ordered array of option strings. Initialise from options on
      // first render, then move items up/down. Submitted as a comma-joined order.
      const order: string[] = Array.isArray(value) && value.length
        ? value
        : (question.options || [])
      const move = (from: number, to: number) => {
        if (to < 0 || to >= order.length) return
        const next = [...order]
        const [item] = next.splice(from, 1)
        next.splice(to, 0, item)
        onChange(next)
      }
      return (
        <ol className="space-y-2">
          {order.map((opt, i) => (
            <li key={opt} className="flex items-center gap-2 rounded-md border border-slate-700 bg-white/5 px-3 py-2">
              <span className="w-6 text-sm font-semibold text-indigo-300">{i + 1}.</span>
              <span className="flex-1">{opt}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, i - 1)} aria-label={`Move ${opt} up`}>↑</Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, i + 1)} aria-label={`Move ${opt} down`}>↓</Button>
            </li>
          ))}
        </ol>
      )
    }

    case "signature": {
      // Minimal canvas-free signature: a typed signature with a styled font.
      // (A real drawn signature needs a <canvas> + pointer handlers; keep typed
      // for the metadata-only stretch.)
      return (
        <div className="space-y-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your full name to sign"
            className="bg-white/5 border-slate-700 text-2xl italic"
            style={{ fontFamily: "cursive" }}
            aria-label="Signature"
          />
          <p className="text-xs text-slate-600">Typing your name counts as your signature.</p>
        </div>
      )
    }

    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border-slate-700" />
```

> Note on `ranking` submit: the public page already joins arrays with `, ` when building `answerText`, so a ranking answer serialises as the ordered, comma-separated list automatically. But because the value starts as a derived array (not user-touched), a *required* ranking question could read as "empty" until reordered — acceptable; reordering or leaving default order both produce a non-empty join once the value is set. If you want the default order to count immediately, initialise `responses[q.questionId]` for ranking questions on form load.

`matrix` (grid) is intentionally left out of literal code — it needs a richer options model (rows + columns) than the flat `options: string[]` supports, so it is a larger schema change. Treat it as its own plan.

## Edge cases & notes
- `linear_scale` stores a number; the public submit flow coerces it to a string for `answerText` — fine.
- `time` stores `"HH:MM"`; renders correctly in the dark UI thanks to the existing `inv-color-scheme` utility (same as `date`).
- `file_upload` metadata-only: never trust it as proof of an uploaded artifact.
- Respect the 3-place rule: the three core cases needed only the renderer because the type + editor entries already exist; the stretch types touch all three files.
- No backend edit: `questionType` is `String` in Mongoose and validated only for non-empty `questionText` in `createForm`.

## Verification
- `cd frontend && rtk tsc` (the new `case`s must be exhaustive-friendly; union additions for stretch types must compile).
- Manual: create/edit a form with one of each new type. Open the public link:
  - `linear_scale` → draggable slider with min/value/max labels; value updates.
  - `time` → native time picker, dark-styled.
  - `file_upload` → file picker; selecting a file shows "Selected: <name>".
  - (stretch) `ranking` → up/down reordering; `signature` → cursive typed input.
- Submit and confirm answers appear in the responses export with sensible text.
- No backend typecheck needed unless you added backend storage (not in this plan).
