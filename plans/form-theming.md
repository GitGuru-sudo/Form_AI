# Form Theming

> Status: Not started. Effort: M. Area: Form building & UX.

## Goal
Let form authors brand a form: a per-form accent color, an optional cover image URL, a logo URL, and a light/dark override. Store these under a `theme` object on the Form, configure them in a theming panel in the editor (`app/forms/[id]/page.tsx`), and apply them on the public form (`f/[token]/page.tsx`) via inline styles / CSS variables. The default (no theme) keeps the existing dark/indigo look unchanged.

## Dependencies to install
None.

## Files touched
- `frontend/src/types/index.ts` — edit — add `FormTheme` + `theme?` on `Form`.
- `backend/src/models/form.model.ts` — edit — add `theme` sub-document.
- `frontend/src/app/forms/[id]/page.tsx` — edit — add a theming panel.
- `frontend/src/app/f/[token]/page.tsx` — edit — consume the theme.

## Step-by-step

### Step 1 — Add the `FormTheme` type (`frontend/src/types/index.ts`)
**Find**:
```ts
export interface Form {
  _id?: string;
  clerkUserId: string;
  title: string;
  description?: string;
  shareToken: string;
  isActive: boolean;
  collectFullName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  collectAge: boolean;
  collectDateOfBirth: boolean;
  collectGender: boolean;
  questions: Question[];
  responseCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
```
**Replace with**:
```ts
export interface FormTheme {
  accent?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  mode?: "light" | "dark";
}

export interface Form {
  _id?: string;
  clerkUserId: string;
  title: string;
  description?: string;
  shareToken: string;
  isActive: boolean;
  collectFullName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  collectAge: boolean;
  collectDateOfBirth: boolean;
  collectGender: boolean;
  questions: Question[];
  theme?: FormTheme;
  responseCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
```

### Step 2 — Add `theme` to the Mongoose model (`backend/src/models/form.model.ts`)
**Find**:
```ts
  collectGender: boolean;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}
```
**Replace with**:
```ts
  collectGender: boolean;
  questions: IQuestion[];
  theme?: {
    accent?: string;
    coverImageUrl?: string;
    logoUrl?: string;
    mode?: 'light' | 'dark';
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Find**:
```ts
  questions: [QuestionSchema],
}, { timestamps: true });
```
**Replace with**:
```ts
  questions: [QuestionSchema],
  theme: {
    type: new Schema({
      accent: { type: String },
      coverImageUrl: { type: String },
      logoUrl: { type: String },
      mode: { type: String, enum: ['light', 'dark'] }
    }, { _id: false }),
    default: undefined
  },
}, { timestamps: true });
```

> `theme` is not in `PROTECTED_FIELDS`, so `updateForm`'s `$set` persists it automatically.

### Step 3 — Add a theming panel to the editor (`frontend/src/app/forms/[id]/page.tsx`)
**Find** (imports):
```ts
import { ArrowLeft, Save, Copy, Check, Download, Loader2 } from "lucide-react"
```
**Replace with**:
```ts
import { ArrowLeft, Save, Copy, Check, Download, Loader2, Palette } from "lucide-react"
import { Label } from "@/components/ui/label"
```

**Find** (the title/description block and the `<FormEditor .../>` after it):
```tsx
          {/* Questions with Drag & Drop */}
          <FormEditor
            questions={form.questions}
            onChange={(questions) => setForm((prev) => ({ ...prev!, questions }))}
          />
```
**Replace with**:
```tsx
          {/* Theming panel */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <Palette size={15} className="text-indigo-400" />
              Branding & Theme
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Accent color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.theme?.accent || "#4f46e5"}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, accent: e.target.value } }))
                    }
                    className="h-9 w-12 cursor-pointer rounded border border-slate-800 bg-slate-950 p-0.5"
                    aria-label="Accent color"
                  />
                  <Input
                    value={form.theme?.accent || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, accent: e.target.value } }))
                    }
                    placeholder="#4f46e5"
                    className="bg-slate-950 border-slate-800 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Mode</Label>
                <select
                  value={form.theme?.mode || "dark"}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, mode: e.target.value as "light" | "dark" } }))
                  }
                  className="h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm"
                >
                  <option value="dark">Dark (default)</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Cover image URL</Label>
                <Input
                  value={form.theme?.coverImageUrl || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, coverImageUrl: e.target.value } }))
                  }
                  placeholder="https://…/cover.jpg"
                  className="bg-slate-950 border-slate-800 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Logo URL</Label>
                <Input
                  value={form.theme?.logoUrl || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev!, theme: { ...prev!.theme, logoUrl: e.target.value } }))
                  }
                  placeholder="https://…/logo.png"
                  className="bg-slate-950 border-slate-800 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Questions with Drag & Drop */}
          <FormEditor
            questions={form.questions}
            onChange={(questions) => setForm((prev) => ({ ...prev!, questions }))}
          />
```

### Step 4 — Consume the theme on the public page (`frontend/src/app/f/[token]/page.tsx`)
Apply the accent via a CSS variable + inline style on the root, swap background/text for light mode, and render cover/logo above the title. We override the hardcoded indigo submit button to use the accent.

**Find** (the outer return wrapper through the header block):
```tsx
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
```tsx
  if (!form) return null

  const theme = form.theme || {}
  const accent = theme.accent || "#4f46e5"
  const isLight = theme.mode === "light"
  const rootClass = isLight ? "bg-white text-slate-900" : "bg-slate-950 text-white"
  const titleClass = isLight ? "text-slate-900" : "text-white"
  const descClass = isLight ? "text-slate-600" : "text-slate-400"

  return (
    <div
      className={`min-h-screen ${rootClass} py-12 px-6`}
      style={{ ["--form-accent" as any]: accent }}
    >
      <div className="max-w-2xl mx-auto space-y-8">
        {theme.coverImageUrl && (
          <img
            src={theme.coverImageUrl}
            alt=""
            className="h-40 w-full rounded-xl object-cover"
          />
        )}
        {theme.logoUrl && (
          <img src={theme.logoUrl} alt="Logo" className="h-12 w-auto" />
        )}
        <div className="space-y-2 mb-12">
          <h1 className={`text-4xl font-extrabold text-balance ${titleClass}`}>
            {form.title}
          </h1>
          {form.description && <p className={`${descClass} text-lg leading-relaxed`}>{form.description}</p>}
        </div>
```

**Find** (the submit button):
```tsx
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 transition-all font-bold"
            >
```
**Replace with**:
```tsx
            <Button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: "var(--form-accent)" }}
              className="w-full h-14 text-lg transition-all font-bold text-white hover:brightness-110"
            >
```

## Edge cases & notes
- No theme set → `accent` falls back to `#4f46e5` (the same indigo-600) and `mode` stays dark, so existing forms look identical.
- `--form-accent` is a CSS custom property scoped to the form root; reuse it for any other accent surfaces (e.g. rating stars) if desired later.
- Cover/logo are author-supplied URLs — render with `alt=""` for the decorative cover and a real alt for the logo. No upload pipeline (intentional; URLs only).
- Light mode only swaps the page chrome (bg/title/description). The question `Card`s still use `bg-slate-900` styling from their own components; a fuller light theme would require theming `ui/card.tsx`, which is out of scope — note this as a known limitation.
- `theme` rides through `updateForm`'s `$set` (not protected) and through `createForm` only if you also pass it there; the editor's `handleSave` PATCHes the full `form`, so editing an existing form persists the theme.

## Verification
- `cd frontend && rtk tsc`.
- `cd backend && rtk tsc --noEmit`.
- Manual: in the editor set accent to `#16a34a`, mode Light, paste a cover + logo URL, Save. Open the public link → green submit button, light background, cover image and logo render above the title. Clear the theme fields, Save → public form reverts to dark/indigo.
