# FormAI — Feature Roadmap

A backlog of features worth adding to FormAI, grouped by area and roughly ordered by
impact-to-effort. Items marked ✅ already shipped in this iteration.

---

## Recently shipped ✅

- **Quick-start prompt chips** — one-click starter prompts above the chat input.
- **Delete recent forms** — trash button on each form in the sidebar (with confirm).
- **Download responses from the editor** — Excel export button on the Edit Form page.
- **Publishing loader** — a 2–3s branded loading overlay when publishing a form.
- **Simplified create flow** — removed the separate "Personal Information" field step.

---

## 1. AI & form generation

- **Refine via chat** — keep chatting after generation ("make it shorter", "add a
  rating question", "translate to Spanish") instead of regenerating from scratch.
- **Regenerate a single question** — a "↻" on each `QuestionCard` to reroll just that item.
- **Tone / audience control** — pick formal vs. casual, or a target audience, before generating.
- **Form templates gallery** — curated, ready-made forms (NPS, RSVP, intake, quiz) as a starting point.
- **Logic & branching** — show/hide questions based on previous answers (conditional logic).
- **Multi-language forms** — generate and serve a form in several languages.

## 2. Responses & analytics

- **Responses dashboard with charts** — per-question summaries (bar/pie for choice
  questions, histograms for ratings, word cloud for text).
- **CSV / Google Sheets / PDF export** — alongside the existing Excel export.
- **Real-time response feed** — live updates as submissions arrive (websockets/polling).
- **Email notifications** — notify the owner on each new response, or a daily digest.
- **Response filtering & search** — filter by date range, field value, or completion.
- **Partial / abandoned response tracking** — see where respondents drop off.

## 3. Form building & UX

- **Required-field & validation rules in the editor** — min/max, regex, email/phone formats.
- **Question types expansion** — file upload, date/time, matrix/grid, ranking, signature.
- **Form theming** — accent color, cover image, logo, light/dark per-form.
- **Duplicate / clone a form** — start a new form from an existing one.
- **Drafts & autosave** — never lose an in-progress form.
- **Section breaks & multi-page forms** — long forms split across steps with a progress bar.
- **Undo/redo** in the editor.

## 4. Sharing & distribution

- **QR code** for the share link.
- **Embeddable widget** — `<iframe>`/script snippet to drop a form into any site.
- **Custom slugs** — human-readable share URLs (`/f/restaurant-feedback`).
- **Open/close scheduling** — auto-open and auto-close a form by date, or cap total responses.
- **Password-protected forms** and single-response-per-user (via Clerk).

## 5. Collaboration & accounts

- **Workspaces / teams** — share forms with teammates, with roles (owner/editor/viewer).
- **Form folders & tags** — organize a growing list of forms.
- **Activity log** — who edited what and when.

## 6. Platform & quality

- **Toasts instead of `alert()`** — replace native alerts with a toast system (e.g. sonner).
- **Optimistic UI + error boundaries** — smoother failures across the app.
- **Rate limiting & abuse protection** on public submit endpoints.
- **Spam/bot protection** — honeypot field or hCaptcha on public forms.
- **Accessibility pass** — keyboard nav, ARIA labels, focus management, contrast.
- **Unit + e2e tests** — cover form generation, publish, submit, and export flows.
- **Audit logging & soft delete** — recover accidentally deleted forms.

---

### Suggested next three

1. **Responses dashboard with charts** — turns raw responses into insight; highest user value.
2. **Refine via chat** — leans into the AI differentiator and reduces regeneration friction.
3. **Toasts + validation in editor** — quick UX wins that make the app feel production-grade.
