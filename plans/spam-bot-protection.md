# Spam & bot protection (public form)

> Status: Not started. Effort: S (honeypot) / M (CAPTCHA optional). Area: Platform & quality.

## Goal
Reduce automated spam submissions on the public form. Start with a zero-dependency **honeypot** field + an optional **time-trap** (both invisible to humans, server-enforced with a silent 200 so bots get no feedback). Provide an optional, clearly-labeled hCaptcha / Cloudflare Turnstile upgrade for higher-volume abuse. Pairs with [[rate-limiting]] (IP throttling) for layered defense.

## Dependencies to install
- Honeypot + time-trap: **None**.
- Optional CAPTCHA: no backend package required — verification is a single `fetch`/axios POST to the provider. (`axios` is already a backend dependency.)

## Files touched
- `frontend/src/app/f/[token]/page.tsx` — edit — add hidden honeypot input + render timestamp; include `_hp` and `_t` in the submit payload.
- `backend/src/controllers/responses.controller.ts` — edit — reject honeypot-filled / too-fast submits in `submitResponse` with a silent fake success.
- (Optional) `frontend/src/app/f/[token]/page.tsx` + `backend/src/controllers/responses.controller.ts` — edit — hCaptcha/Turnstile widget + server verify.

## Step-by-step

### Step 1 — Honeypot + render-time state (frontend, `f/[token]/page.tsx`)
Add a hidden field bots tend to auto-fill and a "form rendered at" timestamp for the time-trap.

**Find** (the personal-info / answers state block):
```tsx
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [personalInfo, setPersonalInfo] = useState<Record<string, any>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
```
**Replace with**:
```tsx
  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [personalInfo, setPersonalInfo] = useState<Record<string, any>>({})
  // Honeypot: real users never see or fill this. Bots that auto-fill every input will.
  const [honeypot, setHoneypot] = useState("")
  // Time-trap: when the form became interactive, used to reject sub-2s submits.
  const renderedAtRef = useRef<number>(Date.now())
  const [isSubmitted, setIsSubmitted] = useState(false)
```

Add `useRef` to the React import.
**Find**:
```tsx
import { useState, useEffect } from "react"
```
**Replace with**:
```tsx
import { useState, useEffect, useRef } from "react"
```

### Step 2 — Render the hidden honeypot input (frontend)
Place the honeypot inside the `<form>`, immediately after the opening tag. It must be visually hidden but **not** `display:none`-only (some bots skip those) and must have `tabIndex={-1}` + `autoComplete="off"` + `aria-hidden` so humans/AT never reach it.

**Find**:
```tsx
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Personal Info Section */}
```
**Replace with**:
```tsx
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Honeypot — must stay empty. Hidden from humans + assistive tech. */}
          <div className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="website">Leave this field empty</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Personal Info Section */}
```

### Step 3 — Include trap fields in the submit payload (frontend)
**Find**:
```tsx
    setSubmitting(true)
    try {
      await api.post(`/api/f/${token}/submit`, {
        ...personalInfo,
        answers: preparedAnswers
      })
      setIsSubmitted(true)
      window.scrollTo(0, 0)
```
**Replace with**:
```tsx
    setSubmitting(true)
    try {
      await api.post(`/api/f/${token}/submit`, {
        ...personalInfo,
        answers: preparedAnswers,
        _hp: honeypot,
        _t: Date.now() - renderedAtRef.current,
      })
      setIsSubmitted(true)
      window.scrollTo(0, 0)
```

### Step 4 — Reject silently server-side (backend, `submitResponse`)
Return a fake `201` so bots can't distinguish rejection from success (no signal to tune against). Log it for visibility.

**Find** (top of `submitResponse`, the destructure + form lookup):
```ts
export const submitResponse = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { respondentName, respondentEmail, respondentPhone, respondentAge, respondentDOB, respondentGender, answers } = req.body;

    const form = await Form.findOne({ shareToken: token });
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
```
**Replace with**:
```ts
export const submitResponse = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { respondentName, respondentEmail, respondentPhone, respondentAge, respondentDOB, respondentGender, answers, _hp, _t } = req.body;

    // Honeypot: a filled hidden field means a bot. Pretend success, save nothing.
    if (typeof _hp === 'string' && _hp.trim().length > 0) {
      logger.warn('spam rejected (honeypot)', { token, ip: req.ip });
      return res.status(201).json({ message: 'Response submitted successfully' });
    }

    // Time-trap: humans take longer than 2s to fill a form. Reject sub-2s submits.
    // `_t` is elapsed ms since the form rendered; ignore when absent (older clients).
    if (typeof _t === 'number' && _t >= 0 && _t < 2000) {
      logger.warn('spam rejected (time trap)', { token, elapsedMs: _t, ip: req.ip });
      return res.status(201).json({ message: 'Response submitted successfully' });
    }

    const form = await Form.findOne({ shareToken: token });
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
```

Add the logger import at the top of the controller (the file does not currently import it).
**Find**:
```ts
import { Request, Response } from 'express';
import Form from '../models/form.model';
import ResponseModel from '../models/response.model';
import ExcelJS from 'exceljs';
```
**Replace with**:
```ts
import { Request, Response } from 'express';
import Form from '../models/form.model';
import ResponseModel from '../models/response.model';
import ExcelJS from 'exceljs';
import logger from '../lib/logger';
```

## Optional — hCaptcha / Cloudflare Turnstile (heavier; only if honeypot proves insufficient)

> Recommended ONLY when spam persists past honeypot + rate limiting. Adds a visible/invisible challenge and a network round-trip on every submit.

### Optional Step A — Frontend widget (Turnstile shown; hCaptcha is analogous)
Add the provider script and a widget that yields a token, then send it as `_captcha`.

1. Add the script in `frontend/src/app/f/[token]/layout.tsx` (or via `next/script` in the page):
```tsx
import Script from "next/script"
// ...
<Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
```
2. Render the widget inside the `<form>` (before the submit button) and capture the token:
```tsx
<div
  className="cf-turnstile"
  data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
  data-theme="dark"
  data-callback="onTurnstile"
/>
```
3. Include the token in the payload alongside `_hp`/`_t`:
```tsx
await api.post(`/api/f/${token}/submit`, {
  ...personalInfo,
  answers: preparedAnswers,
  _hp: honeypot,
  _t: Date.now() - renderedAtRef.current,
  _captcha: captchaToken,
})
```

### Optional Step B — Backend verify (in `submitResponse`, after the time-trap check)
Use the provider's secret (store like the existing Resend key, e.g. `TURNSTILE_SECRET_KEY` in `backend/.env`). Reject on failure with a **real** error here (CAPTCHA failure is a legitimate, user-facing error, unlike the silent honeypot).
```ts
import axios from 'axios'; // already a backend dependency

// ...inside submitResponse, after the time-trap block:
if (process.env.TURNSTILE_SECRET_KEY) {
  const verify = await axios.post(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: String(req.body._captcha ?? ''),
      remoteip: req.ip ?? '',
    })
  );
  if (!verify.data?.success) {
    logger.warn('captcha verification failed', { token, ip: req.ip });
    return res.status(400).json({ message: 'Captcha verification failed. Please try again.' });
  }
}
```

## Edge cases & notes
- **Silent vs loud rejection**: honeypot and time-trap return a fake `201` on purpose — a `400` would tell a bot exactly what to fix. CAPTCHA returns a real `400` because the human needs to retry the challenge.
- **Time-trap false positives**: 2000ms is conservative; password managers/autofill can submit fast. Tune up if real users get caught. The check is skipped when `_t` is absent, so it never hard-breaks older clients.
- **Honeypot field name**: `website` is a common bait name autofillers target; keep the payload key `_hp` distinct so it can't collide with real fields. Don't use a name like `email`/`name` that a real autofill would populate.
- **Accessibility**: the honeypot uses `aria-hidden`, `tabIndex={-1}`, off-screen positioning, and a label — screen readers and keyboard users never reach it. Do not rely on `display:none` alone.
- **Express 5**: handlers stay synchronous-returning except the optional `await axios.post(...)`; it's inside the existing `try/catch`, so a verify network failure is caught and returns 500 — acceptable, or wrap to fail-open if provider downtime shouldn't block submissions.

## Verification
- `cd frontend && rtk tsc` and `cd backend && rtk tsc --noEmit` → no type errors.
- Manual human path: load `/f/:token`, fill normally (>2s), submit → `201`, response saved, "Thank you!" screen.
- Honeypot path:
  ```bash
  rtk curl -s -X POST http://localhost:8000/api/f/REAL_TOKEN/submit -H "Content-Type: application/json" -d '{"answers":[],"_hp":"http://spam.example","_t":5000}'
  ```
  Expect `201` but **no** new document in the `responses` collection; backend logs `spam rejected (honeypot)`.
- Time-trap path: same curl with `"_t":500` and empty `_hp` → `201`, nothing saved, logs `spam rejected (time trap)`.
- Confirm the honeypot input is not focusable: Tab through the live form — focus never lands on it.
