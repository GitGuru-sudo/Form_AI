# Undo / Redo Editor

> Status: Not started. Effort: M. Area: Form building & UX.

## Goal
Add undo/redo to the form editor (`app/forms/[id]/page.tsx`). Introduce a generic history hook `useHistoryState<T>` that wraps a value with past/future stacks, swap the editor's `useState<Form | null>` for it with minimal churn, and wire Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y) keyboard shortcuts plus toolbar Undo/Redo buttons.

## Dependencies to install
None.

## Files touched
- `frontend/src/hooks/useHistoryState.ts` — new — generic history hook.
- `frontend/src/app/forms/[id]/page.tsx` — edit — adopt the hook, add shortcuts + buttons.

## Step-by-step

### Step 1 — Create the history hook (`frontend/src/hooks/useHistoryState.ts`)
Create `frontend/src/hooks/useHistoryState.ts` with full contents:
```ts
import { useCallback, useState } from "react"

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export interface UseHistoryState<T> {
  state: T
  set: (next: T | ((prev: T) => T)) => void
  reset: (value: T) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

// Generic undo/redo container. `set` pushes the current value onto the past
// stack and clears the redo (future) stack — standard history semantics.
// `reset` replaces the present without recording history (use it for the
// initial server load so the very first state isn't "undoable" into nothing).
const MAX_HISTORY = 100

export function useHistoryState<T>(initial: T): UseHistoryState<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  })

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setHistory(curr => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(curr.present)
          : next
      if (Object.is(resolved, curr.present)) return curr
      const past = [...curr.past, curr.present]
      if (past.length > MAX_HISTORY) past.shift()
      return { past, present: resolved, future: [] }
    })
  }, [])

  const reset = useCallback((value: T) => {
    setHistory({ past: [], present: value, future: [] })
  }, [])

  const undo = useCallback(() => {
    setHistory(curr => {
      if (curr.past.length === 0) return curr
      const previous = curr.past[curr.past.length - 1]
      const past = curr.past.slice(0, -1)
      return { past, present: previous, future: [curr.present, ...curr.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory(curr => {
      if (curr.future.length === 0) return curr
      const next = curr.future[0]
      const future = curr.future.slice(1)
      return { past: [...curr.past, curr.present], present: next, future }
    })
  }, [])

  return {
    state: history.present,
    set,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
```

### Step 2 — Adopt the hook in the editor (`frontend/src/app/forms/[id]/page.tsx`)
The current code stores `const [form, setForm] = useState<Form | null>(null)`. The hook needs a concrete initial value, so initialise with `null` and treat `form` as `Form | null` exactly as before. We keep a thin `setForm` shim so the existing `setForm((prev) => ...)` call sites compile unchanged.

**Find** (imports):
```ts
import { useState, useEffect } from "react"
import { Form } from "@/types"
import { ArrowLeft, Save, Copy, Check, Download, Loader2 } from "lucide-react"
```
**Replace with**:
```ts
import { useState, useEffect, useCallback } from "react"
import { Form } from "@/types"
import { ArrowLeft, Save, Copy, Check, Download, Loader2, Undo2, Redo2 } from "lucide-react"
import { useHistoryState } from "@/hooks/useHistoryState"
```

**Find**:
```ts
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
```
**Replace with**:
```ts
  const {
    state: form,
    set: setFormHistory,
    reset: resetForm,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState<Form | null>(null)

  // Shim so existing `setForm((prev) => ...)` and `setForm(value)` call sites
  // keep working while routing through the history hook.
  const setForm = useCallback(
    (next: Form | null | ((prev: Form | null) => Form | null)) => {
      setFormHistory(next as any)
    },
    [setFormHistory]
  )

  const [loading, setLoading] = useState(true)
```

**Find** (the fetch effect sets the form — use `resetForm` so the initial load is not an undoable step):
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
        resetForm(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
```
> Update the effect's dependency array if your linter flags it. The fetch effect currently has `[id]`; add `resetForm` → `[id, resetForm]` (it's stable via `useCallback`).

### Step 3 — Keyboard shortcuts (`frontend/src/app/forms/[id]/page.tsx`)
Add a global keydown listener. Place this effect after the existing fetch `useEffect`.
**Find** (the fetch effect's closing — pick the unique `fetchForm()` invocation line):
```ts
    fetchForm()
  }, [id])
```
**Replace with**:
```ts
    fetchForm()
  }, [id, resetForm])

  // Undo/redo keyboard shortcuts. Ignore when focus is in a text field so the
  // browser's native text undo still works inside inputs/textareas.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isTextField =
        tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable
      if (isTextField) return
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [undo, redo])
```

### Step 4 — Toolbar Undo/Redo buttons (`frontend/src/app/forms/[id]/page.tsx`)
**Find** (the header action group opener, before the Download button):
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
            <div className="flex items-center gap-1 mr-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                className="text-slate-400 hover:text-white disabled:opacity-30"
              >
                <Undo2 size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
                className="text-slate-400 hover:text-white disabled:opacity-30"
              >
                <Redo2 size={18} />
              </Button>
            </div>
            <Button
              variant="outline"
              className="border-slate-800 hover:border-slate-700 hover:bg-slate-900"
              onClick={handleDownload}
              disabled={downloading}
            >
```

## Edge cases & notes
- **Minimal churn:** the `setForm` shim means every existing `setForm((prev) => ({ ...prev!, ... }))` call (title, description, questions) flows through history unchanged — no edits to those call sites.
- `resetForm` is used for the server load so the user can't undo into a `null` form. Real edits (typing, add/delete/reorder questions) go through `set` and are undoable.
- The keydown listener skips inputs/textareas so the browser's native per-character text undo still works while typing a question; structural changes (add/delete/reorder, type changes via the Select which blurs) are what the global undo targets. If you want character-level history too, remove the `isTextField` guard — but note that records one history entry per keystroke (history capped at `MAX_HISTORY=100`).
- `Object.is` short-circuit in `set` avoids pushing a no-op identical state.
- History is in-memory only; navigating away clears it. Pairs cleanly with the autosave plan (`drafts-autosave.md`) — autosave persists the present; undo/redo is session-local.
- If both this plan and `drafts-autosave.md` are applied, the autosave effect should watch `form` (the history `state`) — which it already does, since `form` is the destructured `state`. Undo/redo will therefore trigger an autosave of the reverted state. That's the desired behavior.

## Verification
- `cd frontend && rtk tsc`.
- Manual: open a form, add a question, change its type, delete another. Press Ctrl+Z repeatedly → each structural change reverts in order; toolbar Undo greys out at the loaded state. Ctrl+Shift+Z (or Ctrl+Y) re-applies. Toolbar buttons mirror `canUndo`/`canRedo` enablement. Typing inside a question input still does native text undo without nuking structural history.
