# Drafts & Autosave

> Status: Not started. Effort: M. Area: Form building & UX.

## Goal
Never lose an in-progress edit. In the editor (`app/forms/[id]/page.tsx`), debounce-autosave the form ~1.5s after the author stops typing, with a "Saving… / Saved" status indicator (Approach A, recommended — lowest risk, reuses the existing PATCH). In the CREATE flow (`create/preview/page.tsx`), persist the generated draft to `localStorage` so a refresh before publish doesn't lose the AI-generated form (Approach B for the unpublished case).

## Dependencies to install
None.

## Files touched
- `frontend/src/hooks/useDebouncedValue.ts` — new — generic debounce hook.
- `frontend/src/app/forms/[id]/page.tsx` — edit — autosave effect + status indicator.
- `frontend/src/app/create/preview/page.tsx` — edit — persist draft to localStorage on change, restore on mount.

## Step-by-step

### Step 1 — Create the debounce hook (`frontend/src/hooks/useDebouncedValue.ts`)
Create `frontend/src/hooks/useDebouncedValue.ts` with full contents:
```ts
import { useEffect, useState } from "react"

// Returns `value` delayed by `delayMs`. The returned value only updates after
// `value` has stopped changing for the full delay window.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
```

### Step 2 — Wire autosave into the editor (`frontend/src/app/forms/[id]/page.tsx`)
**Find** (imports):
```ts
import { useState, useEffect } from "react"
import { Form } from "@/types"
import { ArrowLeft, Save, Copy, Check, Download, Loader2 } from "lucide-react"
```
**Replace with**:
```ts
import { useState, useEffect, useRef } from "react"
import { Form } from "@/types"
import { ArrowLeft, Save, Copy, Check, Download, Loader2, Cloud, CloudOff } from "lucide-react"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
```

**Find** (the state block):
```ts
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
```
**Replace with**:
```ts
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // Skip autosaving the very first render after the form loads (nothing changed yet).
  const skipNextAutosave = useRef(true)
  const debouncedForm = useDebouncedValue(form, 1500)
```

**Find** (the existing fetch effect — we set the skip flag when the initial load completes):
```ts
        setForm(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
```
**Replace with**:
```ts
        setForm(res.data)
        skipNextAutosave.current = true
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
```

**Find** (the `handleSave` function — add the autosave effect right after it):
```ts
  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    try {
      const token = await getToken()
      await api.patch(`/api/forms/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Changes saved")
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save changes", { description: "Please try again." })
    } finally {
      setSaving(false)
    }
  }
```
**Replace with**:
```ts
  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    try {
      const token = await getToken()
      await api.patch(`/api/forms/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Changes saved")
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save changes", { description: "Please try again." })
    } finally {
      setSaving(false)
    }
  }

  // Debounced autosave: fires 1.5s after the last edit. Silent (no toast) — the
  // inline indicator communicates status. The manual Save button still works.
  useEffect(() => {
    if (!debouncedForm) return
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false
      return
    }
    let cancelled = false
    const save = async () => {
      setAutosaveState("saving")
      try {
        const token = await getToken()
        await api.patch(`/api/forms/${id}`, debouncedForm, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!cancelled) setAutosaveState("saved")
      } catch (err) {
        console.error("Autosave failed", err)
        if (!cancelled) setAutosaveState("error")
      }
    }
    save()
    return () => {
      cancelled = true
    }
  }, [debouncedForm, id, getToken])
```

**Find** (the header action group, before the Download button):
```tsx
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-slate-800 hover:border-slate-700 hover:bg-slate-900"
              onClick={handleDownload}
              disabled={downloading}
            >
```
**Replace with**:
```tsx
          <div className="flex items-center gap-3">
            {autosaveState !== "idle" && (
              <span
                className="flex items-center gap-1.5 text-xs text-slate-400"
                role="status"
                aria-live="polite"
              >
                {autosaveState === "saving" && (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Saving…
                  </>
                )}
                {autosaveState === "saved" && (
                  <>
                    <Cloud size={13} className="text-green-400" />
                    Saved
                  </>
                )}
                {autosaveState === "error" && (
                  <>
                    <CloudOff size={13} className="text-red-400" />
                    Couldn&apos;t save
                  </>
                )}
              </span>
            )}
            <Button
              variant="outline"
              className="border-slate-800 hover:border-slate-700 hover:bg-slate-900"
              onClick={handleDownload}
              disabled={downloading}
            >
```

### Step 3 — Persist the CREATE-flow draft to localStorage (`frontend/src/app/create/preview/page.tsx`)
The preview page already reads `generatedForm` from `localStorage` on mount and removes it on publish. Add: re-write `localStorage` on every edit so a refresh restores the latest in-progress draft (not just the original AI output).

**Find** (the mount effect):
```ts
  useEffect(() => {
    const saved = localStorage.getItem("generatedForm")
    if (saved) {
      setForm(JSON.parse(saved))
    } else {
      router.push("/create")
    }
  }, [router])

  if (!form) return null
```
**Replace with**:
```ts
  useEffect(() => {
    const saved = localStorage.getItem("generatedForm")
    if (saved) {
      setForm(JSON.parse(saved))
    } else {
      router.push("/create")
    }
  }, [router])

  // Persist every edit so a refresh before publishing restores the latest draft,
  // not just the original AI output. Cleared in handlePublish on success.
  useEffect(() => {
    if (form) {
      localStorage.setItem("generatedForm", JSON.stringify(form))
    }
  }, [form])

  if (!form) return null
```

> `handlePublish` already calls `localStorage.removeItem("generatedForm")` on success, so the persisted draft is cleared once published. On publish failure the draft remains, which is the desired safety net.

## Edge cases & notes
- **Approach A vs B:** Approach A (debounced server autosave) is used for the editor because the form already exists server-side and has a working PATCH. Approach B (localStorage) is used for the create/preview flow because that form has no `_id` yet — it can't be PATCHed until published.
- The `skipNextAutosave` ref prevents an immediate redundant PATCH right after the initial GET populates `form`.
- The autosave effect's `cancelled` flag avoids a stale `setAutosaveState` if the component unmounts (or a newer debounce fires) mid-request.
- Autosave is intentionally silent (no toast) to avoid spamming; the inline indicator + the manual Save button (which still toasts) cover explicit feedback.
- Autosave failure sets the indicator to "Couldn't save" but does not block further editing; the next debounce retries.
- The CREATE-flow localStorage write fires on every keystroke — acceptable for a single small object; it's synchronous and cheap.

## Verification
- `cd frontend && rtk tsc`.
- Manual (editor): edit a question, stop typing → after ~1.5s the indicator shows "Saving…" then "Saved". Reload the page → the edit persisted. Kill the backend, edit again → indicator shows "Couldn't save".
- Manual (create flow): generate a form, edit a question on the preview page, hard-refresh the browser → the edited draft restores (not the original). Publish → reload `/create/preview` redirects to `/create` (draft cleared).
