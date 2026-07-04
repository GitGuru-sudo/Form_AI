# Toasts instead of alert()

> Status: Done — verification only. Effort: S. Area: Platform & quality.

## Goal
Confirm that the toast/confirm UI system has fully replaced native `alert()` / `confirm()` / `window.confirm()` across the frontend. This plan is a verification checklist, not a build. If any straggler native dialogs remain, it gives the exact replacement pattern to fix them.

## Dependencies to install
None. The system is built and mounted already.

## Files touched
- `frontend/src/components/ui/toast.tsx` — exists (verify only) — `ToastProvider` + `useToast()` with `toast.success/error/info`, bottom-right, `aria-live="polite"`.
- `frontend/src/components/ui/confirm.tsx` — exists (verify only) — `ConfirmProvider` + `useConfirm()` promise-based dialog.
- `frontend/src/app/layout.tsx` — exists (verify only) — providers mounted.

## Current state (verified against files)

`frontend/src/app/layout.tsx` already mounts both providers inside `ThemeProvider`:
```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem
  disableTransitionOnChange
>
  <ToastProvider>
    <ConfirmProvider>
      {children}
    </ConfirmProvider>
  </ToastProvider>
</ThemeProvider>
```

`frontend/src/components/ui/toast.tsx` exposes the API used everywhere:
```tsx
export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}
```
The toast region is `role="region" aria-label="Notifications" aria-live="polite"`, bottom-right, dark-styled (`bg-slate-900 border-slate-800`).

`frontend/src/components/ui/confirm.tsx` exposes `useConfirm()` returning `Promise<boolean>`, used for destructive actions (e.g. `Sidebar.tsx` delete uses `confirm({ ..., destructive: true })` then `toast.success`/`toast.error`).

A confirmed live example in `Sidebar.tsx` `handleDelete`:
```tsx
const ok = await confirm({
  title: `Delete "${form.title}"?`,
  description: "This permanently removes the form and all of its responses. This can't be undone.",
  confirmLabel: "Delete form",
  destructive: true,
})
if (!ok) return
// ...
toast.success("Form deleted")
// ...
toast.error("Couldn't delete form", { description: "Please try again." })
```

## Step-by-step

### Step 1 — Grep for any remaining native dialogs
Run from repo root. There should be **zero** matches in real call sites (matches inside `ui/confirm.tsx` for the `confirm` function name / context are expected and fine).

```bash
rtk grep -rn "alert(" frontend/src
rtk grep -rn "window.confirm" frontend/src
rtk grep -rn "window.alert" frontend/src
```

To catch bare `confirm(` calls while ignoring the legitimate `useConfirm` system, exclude the confirm component:
```bash
rtk grep -rn "[^e]confirm(" frontend/src --glob '!**/ui/confirm.tsx'
```

Expected result: no native `alert(` / `window.confirm` / `window.alert`. Any `confirm(` hits should resolve to `useConfirm()` usages (awaited, with an options object), not native browser `confirm("...")`.

### Step 2 — Confirm providers are mounted
```bash
rtk grep -n "ToastProvider\|ConfirmProvider" frontend/src/app/layout.tsx
```
Expected: both `<ToastProvider>` and `<ConfirmProvider>` present, with `ConfirmProvider` nested inside `ToastProvider` inside `ThemeProvider`.

### Step 3 — Confirm consumers import the hooks
```bash
rtk grep -rn "useToast\|useConfirm" frontend/src
```
Expected: surfaces that previously used `alert`/`confirm` now import from `@/components/ui/toast` and `@/components/ui/confirm`.

### Step 4 — Fix pattern for any straggler (only if Step 1 finds one)

**Find** (example straggler):
```tsx
if (confirm("Delete this form?")) {
  await api.delete(`/api/forms/${id}`)
  alert("Deleted")
}
```
**Replace with**:
```tsx
const ok = await confirm({
  title: "Delete this form?",
  description: "This can't be undone.",
  confirmLabel: "Delete",
  destructive: true,
})
if (ok) {
  try {
    await api.delete(`/api/forms/${id}`)
    toast.success("Form deleted")
  } catch {
    toast.error("Couldn't delete form", { description: "Please try again." })
  }
}
```
At the top of the component add the hooks (component must be a `"use client"` component):
```tsx
const { toast } = useToast()
const confirm = useConfirm()
```
and the imports:
```tsx
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm"
```

## Edge cases & notes
- The `confirm` from `useConfirm()` is **async** — it must be `await`ed and lives inside an `async` handler. A leftover synchronous `if (confirm(...))` is the most likely straggler shape.
- `useToast()` / `useConfirm()` only work in client components and only under the providers — both are mounted globally in `layout.tsx`, so any client component qualifies.
- Toasts auto-dismiss after 4s (`VISIBLE_MS = 4000`); don't use a toast where a blocking confirmation is required — use `useConfirm()` instead.
- Public form page `f/[token]/page.tsx` deliberately uses inline `role="alert"` error text and field-level errors, not toasts/confirm — that is intended UX (respondent-facing), not a straggler.

## Verification
- `rtk grep -rn "alert(" frontend/src` → no matches.
- `rtk grep -rn "window.confirm" frontend/src` → no matches.
- `rtk grep -n "ToastProvider\|ConfirmProvider" frontend/src/app/layout.tsx` → both present.
- Manual smoke test (dark UI, bottom-right toast) per surface:
  - **Delete** a recent form in the sidebar → confirm dialog appears → on confirm, `toast.success("Form deleted")`.
  - **Save** a form edit → success toast.
  - **Publish / toggle active** a form → success toast.
  - **Export** responses → success/error toast.
  - Force an error (stop backend) and retry delete → `toast.error` with description.
- `cd frontend && rtk tsc` → no type errors.
- `cd frontend && rtk npm run build` (with `--legacy-peer-deps` already installed) → build passes (ESLint is ignored in build; build is the source of truth).
