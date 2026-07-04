# Optimistic UI & error boundaries

> Status: Not started. Effort: M. Area: Platform & quality.

## Goal
Add Next App Router error boundaries (`app/error.tsx` + `app/global-error.tsx`) so uncaught render/data errors show a styled "Something went wrong" screen with a reset button instead of a white page. Add a global axios error interceptor in `src/lib/api.ts` so network failures surface consistently (toast is the channel). Demonstrate an optimistic-update pattern for the sidebar delete that updates the UI first and rolls back on error.

## Dependencies to install
None. Next 14 App Router error boundaries and axios interceptors are built-in.

## Files touched
- `frontend/src/app/error.tsx` — new — route-segment error boundary (styled, reset button).
- `frontend/src/app/global-error.tsx` — new — root error boundary (replaces `<html>` on root layout crash).
- `frontend/src/components/ErrorBoundaryFallback.tsx` — new (optional) — reusable shared fallback UI for the two boundaries.
- `frontend/src/lib/api.ts` — edit — full rewrite adding a response error interceptor + helper.
- `frontend/src/components/Sidebar.tsx` — edit — convert delete to optimistic update with rollback.

## Step-by-step

### Step 1 — Reusable fallback UI (`frontend/src/components/ErrorBoundaryFallback.tsx`)
Create `frontend/src/components/ErrorBoundaryFallback.tsx` with full contents:
```tsx
"use client"

import { AlertCircle, RotateCcw } from "lucide-react"

export function ErrorBoundaryFallback({
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again — if it keeps happening, refresh the page.",
}: {
  reset: () => void
  title?: string
  description?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-10 w-10 text-red-400" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  )
}
```

### Step 2 — Route-segment error boundary (`frontend/src/app/error.tsx`)
Create `frontend/src/app/error.tsx` with full contents. This catches errors in any nested route segment under the root layout (the layout, providers, and `<html>` stay mounted):
```tsx
"use client"

import { useEffect } from "react"
import { ErrorBoundaryFallback } from "@/components/ErrorBoundaryFallback"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <ErrorBoundaryFallback reset={reset} />
}
```

### Step 3 — Root global error boundary (`frontend/src/app/global-error.tsx`)
Create `frontend/src/app/global-error.tsx` with full contents. `global-error.tsx` must render its own `<html>`/`<body>` because it replaces the root layout when the root layout itself throws:
```tsx
"use client"

import { useEffect } from "react"
import { AlertCircle, RotateCcw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <div className="max-w-md space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-10 w-10 text-red-400" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Something went wrong</h1>
              <p className="text-slate-400">
                The app hit an unexpected error. Try again, or refresh the page.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
```

### Step 4 — Global axios error interceptor (`frontend/src/lib/api.ts`)
Full rewrite of the file. Adds a response interceptor that normalizes a human-readable message onto the error and logs it. The toast remains the surfacing channel — call sites still catch and `toast.error(...)`, but now `err.userMessage` gives a consistent string. We deliberately do **not** render toasts from inside `lib/api.ts` (it is not a React component and has no provider access).

**Find** (the entire current file):
```ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

export default api;
```
**Replace with**:
```ts
import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

/** Turn any axios failure into a short, user-facing sentence. */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ message?: string }>;
    if (ax.code === 'ERR_NETWORK') {
      return 'Network error. Check your connection and try again.';
    }
    if (ax.code === 'ECONNABORTED' || ax.code === 'ERR_CANCELED') {
      return 'The request timed out. Please try again.';
    }
    const status = ax.response?.status;
    const serverMsg = ax.response?.data?.message;
    if (serverMsg) return serverMsg;
    if (status === 401) return 'Your session expired. Please sign in again.';
    if (status === 403) return 'You do not have access to do that.';
    if (status === 404) return 'We could not find what you were looking for.';
    if (status === 429) return 'Too many requests. Please slow down and try again.';
    if (status && status >= 500) return 'The server ran into a problem. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

// Canceled requests (AbortController / timeouts) are control flow, not failures
// the user needs to see surfaced — let them through untouched so call sites can
// branch on err.name (see dashboard generate flow).
api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    const isCanceled =
      error.code === 'ERR_CANCELED' ||
      error.name === 'CanceledError' ||
      error.name === 'AbortError';
    if (!isCanceled) {
      // Attach a normalized message; call sites read it for toast.error(...).
      (error as AxiosError & { userMessage?: string }).userMessage =
        getErrorMessage(error);
      if (process.env.NODE_ENV !== 'production') {
        console.error('[api]', error.config?.method, error.config?.url, error.response?.status);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Step 5 — Optimistic delete with rollback (`frontend/src/components/Sidebar.tsx`)
The current handler removes the form from state only **after** the API resolves. Make it optimistic: remove immediately, restore on error. Use the normalized `userMessage` from the interceptor.

**Find** (the body of `handleDelete` after the confirm gate):
```tsx
    if (!ok) return
    setDeletingId(formId)
    try {
      const token = await getToken()
      await api.delete(`/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setRecentForms(prev => prev.filter(f => f._id !== formId))
      toast.success("Form deleted")
      // If we're currently viewing the deleted form, bounce back to the workspace.
      if (pathname.includes(formId)) {
        router.push("/dashboard")
      }
    } catch (err) {
      console.error("Failed to delete form:", err)
      toast.error("Couldn't delete form", { description: "Please try again." })
    } finally {
      setDeletingId(null)
    }
```
**Replace with**:
```tsx
    if (!ok) return
    setDeletingId(formId)

    // Optimistic: drop it from the list immediately, remember where it was so we
    // can splice it back at the same position if the request fails.
    const prevForms = recentForms
    const removedIndex = recentForms.findIndex(f => f._id === formId)
    setRecentForms(prev => prev.filter(f => f._id !== formId))

    try {
      const token = await getToken()
      await api.delete(`/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Form deleted")
      // If we're currently viewing the deleted form, bounce back to the workspace.
      if (pathname.includes(formId)) {
        router.push("/dashboard")
      }
    } catch (err) {
      // Roll back to the exact previous list on failure.
      setRecentForms(prev => {
        if (prev.some(f => f._id === formId)) return prev
        const restored = [...prev]
        const at = removedIndex >= 0 ? removedIndex : restored.length
        restored.splice(at, 0, prevForms[removedIndex])
        return restored
      })
      const message =
        (err as { userMessage?: string }).userMessage ?? "Please try again."
      toast.error("Couldn't delete form", { description: message })
    } finally {
      setDeletingId(null)
    }
```

## Edge cases & notes
- **Boundary scope**: `app/error.tsx` does **not** catch errors thrown in the root `app/layout.tsx` (providers, `<html>`) — only `app/global-error.tsx` does, and only in production builds (in dev, Next shows its overlay). Test global-error with `npm run build && npm start`.
- `reset()` re-renders the segment; if the underlying error is a transient fetch failure, retrying may succeed. It does not clear React state outside the segment.
- The interceptor must **not** swallow `CanceledError` — `dashboard/page.tsx` relies on `err.name === 'CanceledError' || 'AbortError'` to distinguish user-cancel/timeout from real failures. The rewrite preserves that by rejecting canceled errors unchanged.
- The interceptor does not auto-toast because `lib/api.ts` is outside the React tree (no `useToast` access). Surfacing stays at call sites; the interceptor only standardizes `err.userMessage`.
- Optimistic rollback restores at the original index; if `recentForms` is only the top-5 slice, position is still correct relative to what's shown.

## Verification
- `cd frontend && rtk tsc` → no type errors.
- `cd frontend && rtk npm run build` → build passes; `app/error.tsx` and `app/global-error.tsx` are picked up as error boundaries.
- Manual: throw inside a route component (`throw new Error('boom')` temporarily in a page) → styled "Something went wrong" with working "Try again".
- Manual optimistic: stop the backend, delete a sidebar form → it vanishes instantly, then reappears at its spot with a `toast.error` describing the network failure. Start backend, delete again → vanishes and stays gone, `toast.success("Form deleted")`.
- Manual network message: with backend off, confirm the toast description reads "Network error. Check your connection and try again."
