# Real-time Response Feed

> Status: Not started. Effort: S (polling) / M (SSE). Area: Responses & analytics.

## Goal
Make the responses page update live as new submissions arrive, without a manual refresh. **Recommended: polling** — a `setInterval` that re-fetches `/responses` every 15s with proper cleanup, pausing when the tab is hidden. An **SSE upgrade** (new streaming endpoint + `EventSource`) is documented as the richer option.

## Dependencies to install
None for polling. None for SSE (Express streams natively; `EventSource` is a browser global).

## Files touched (polling — recommended)
- `frontend/src/app/forms/[id]/responses/page.tsx` — edit — extract the fetch into a reusable callback, add a polling effect + a "live / updated" indicator.

---

## Step-by-step (Polling — recommended)

### Step 1 — Extract the fetch and add polling (`frontend/src/app/forms/[id]/responses/page.tsx`)

**Find** (imports — add `useCallback`, `useRef`, and an icon):
```tsx
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"
import { Form, FormResponse } from "@/types"
```
**Replace with**:
```tsx
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect, useCallback, useRef } from "react"
import { Form, FormResponse } from "@/types"
```

**Find** (state + the whole existing fetch effect):
```tsx
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken()
        const [formRes, respRes] = await Promise.all([
          api.get(`/api/forms/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/api/forms/${id}/responses`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        setForm(formRes.data)
        setResponses(respRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])
```
**Replace with**:
```tsx
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const knownCount = useRef(0)

  // Re-fetches responses only (the form definition rarely changes while viewing).
  const refreshResponses = useCallback(async () => {
    try {
      const token = await getToken()
      const respRes = await api.get(`/api/forms/${id}/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data: FormResponse[] = respRes.data
      if (knownCount.current && data.length > knownCount.current) {
        setNewCount(prev => prev + (data.length - knownCount.current))
      }
      knownCount.current = data.length
      setResponses(data)
    } catch (err) {
      console.error(err)
    }
    // getToken/id are stable enough; exclude to avoid re-creating the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Initial load: form + responses in parallel.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken()
        const [formRes, respRes] = await Promise.all([
          api.get(`/api/forms/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/api/forms/${id}/responses`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        setForm(formRes.data)
        setResponses(respRes.data)
        knownCount.current = respRes.data.length
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  // Poll every 15s, but skip while the tab is hidden to save requests/battery.
  useEffect(() => {
    const POLL_MS = 15000
    const tick = () => {
      if (document.visibilityState === "visible") refreshResponses()
    }
    const interval = window.setInterval(tick, POLL_MS)
    // Catch up immediately when the user returns to the tab.
    const onVisible = () => { if (document.visibilityState === "visible") refreshResponses() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [refreshResponses])
```

### Step 2 — Add a "live / new responses" indicator to the header (`frontend/src/app/forms/[id]/responses/page.tsx`)

**Find** (the count sub-line in the header):
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
              <div className="flex items-center gap-3">
                <p className="text-slate-400">{responses.length} response{responses.length !== 1 ? "s" : ""}</p>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Live
                </span>
                {newCount > 0 && (
                  <button
                    onClick={() => setNewCount(0)}
                    className="text-xs rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 px-2 py-0.5 hover:bg-indigo-600/30 transition-colors"
                  >
                    {newCount} new — dismiss
                  </button>
                )}
              </div>
            </div>
```

## Edge cases & notes (polling)
- **No double initial fetch race**: `knownCount` is seeded in the initial effect, so the first poll won't falsely report "new".
- **Tab hidden**: the interval still fires but `tick` early-returns; on return to the tab `onVisible` triggers an immediate refresh.
- The form definition is intentionally not re-polled — only responses change while viewing.
- Works unchanged with the Summary charts plan: both views read the same `responses` state, so charts update on poll too.
- 15s is a safe default for a single-owner dashboard. Lower to 5s if desired; the request is small and authenticated.

---

## Optional upgrade: Server-Sent Events (SSE)

Richer (instant, push-based) but adds a long-lived endpoint and an in-memory subscriber registry. Use only if 15s latency is unacceptable.

### A. New SSE endpoint (`backend/src/controllers/responses.controller.ts`)
Append a streaming handler and a small in-process broadcaster:
```ts
// --- SSE: in-memory subscribers keyed by formId. Single-process only. ---
type SseClient = { res: Response };
const sseClients = new Map<string, Set<SseClient>>();

export function broadcastNewResponse(formId: string) {
  const set = sseClients.get(formId);
  if (!set) return;
  const payload = `event: response\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`;
  for (const c of set) c.res.write(payload);
}

export const streamResponses = async (req: Request, res: Response) => {
  const { id } = req.params;
  const clerkUserId = req.clerkUserId;

  const form = await Form.findOne({ _id: id, clerkUserId }).lean();
  if (!form) {
    return res.status(404).json({ message: 'Form not found or unauthorized' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: ping\ndata: connected\n\n`);

  const client: SseClient = { res };
  if (!sseClients.has(id)) sseClients.set(id, new Set());
  sseClients.get(id)!.add(client);

  // Heartbeat keeps proxies from closing the idle connection.
  const heartbeat = setInterval(() => res.write(`event: ping\ndata: keepalive\n\n`), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.get(id)?.delete(client);
  });
};
```
Then call `broadcastNewResponse` inside `submitResponse`, right after `await newResponse.save();`:
```ts
    await newResponse.save();
    broadcastNewResponse(form._id.toString());
    res.status(201).json({ message: 'Response submitted successfully' });
```

### B. Route (`backend/src/routes/responses.routes.ts`)
```ts
router.get('/forms/:id/responses/stream', requireAuth, responsesController.streamResponses);
```
> Note: EventSource cannot set Authorization headers. Either (a) pass the Clerk token as a query param and adapt `requireAuth` to read `req.query.token`, or (b) keep this owner-only endpoint behind the standard cookie/session if available. Easiest: append `?token=<jwt>` and have a thin SSE-only auth wrapper verify it. This is the main reason SSE is the *optional* path.

### C. Client `EventSource` (replace the polling effect)
```tsx
useEffect(() => {
  let es: EventSource | null = null
  let cancelled = false
  ;(async () => {
    const token = await getToken()
    if (cancelled || !token) return
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    es = new EventSource(`${base}/api/forms/${id}/responses/stream?token=${token}`)
    es.addEventListener("response", () => { refreshResponses() })
    es.onerror = () => { es?.close() /* falls silent; could fall back to polling */ }
  })()
  return () => { cancelled = true; es?.close() }
}, [id, refreshResponses])
```
On each `response` event the client still calls `refreshResponses()` (the event is just a nudge — the authoritative data comes from the authenticated GET), so no payload trust issues.

## Verification
- Polling: `cd frontend && rtk tsc` then `rtk next build`. Manual: open the responses page in one tab, submit via the public form in another → within ~15s the list grows and a "N new" pill appears; the green "Live" dot pulses; switching tabs away and back triggers an immediate refresh.
- SSE (if implemented): `cd backend && rtk tsc --noEmit`; open the page, watch the network panel show an open `text/event-stream`; submit a response → list updates within ~1s; closing the tab removes the subscriber (no leaked intervals — heartbeat cleared on `req.close`).
