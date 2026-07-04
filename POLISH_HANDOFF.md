# FormAI — Polish Handoff

> Resume doc for the `/polish` (impeccable skill) pass on FormAI's frontend.
> Hand this file to Claude in a fresh session to continue exactly where we stopped.
> Last updated: 2026-06-26 (session 3).

---

## How to resume

Tell Claude: **"Read POLISH_HANDOFF.md and continue the polish pass."**
Then it should:
1. Read this file + `PRODUCT.md`.
2. Re-run **Verification** (tsc, lint, build) — currently green as of session 3.
3. Pick up the **Remaining work** list (mostly optional / browser-check-gated).

Skill: **impeccable** (`/polish`), quality bar **flagship**, scope **everything changed in the frontend**, register **product**.

---

## ✅ FIRST THING TO FIX — DONE (session 2 / confirmed session 3)

`frontend/src/app/forms/[id]/responses/page.tsx` — the dangling `useToast` import is **fully wired** as of session 2:
- `import { useToast }` ✓
- `const { toast } = useToast()` alongside other hooks ✓
- `toast.error("Couldn't export responses", { description: "Please try again." })` in the `handleExport` catch ✓

No action needed.

---

## Project at a glance

- **FormAI** — AI form builder. Prompt → LLM drafts form structure → edit in builder → publish public link → review responses.
- **Stack:** Next.js 14.2.35 (App Router), React 18, TypeScript, Tailwind 3.4, shadcn/base-ui (`@base-ui/react`), Clerk auth, next-themes (dark default), lucide-react, dnd-kit, axios. Backend Express + MongoDB + Hugging Face (not in scope).
- **Design identity:** dark-first. `bg-slate-950` surfaces, `bg-slate-900` panels, `border-slate-800`, **indigo-600 accent**, white/slate-400 text. Inter font. One accent, restrained — PRODUCT.md "quiet confidence."
- **Key dirs:** `frontend/src/app/*` (routes), `frontend/src/components/*`, `frontend/src/components/ui/*` (primitives), `frontend/src/app/globals.css` (tokens), `frontend/tailwind.config.ts`.

---

## Root-cause finding (still the key context)

App was scaffolded with shadcn/base-ui components referencing a full design-token vocabulary (`bg-primary`, `bg-muted`, `border-border`, `--radius-md`, etc.) that was **never installed**. Session 1 installed it: `globals.css` token layer + `tailwind.config.ts` mappings + `tailwindcss-animate`. This repaired invisible active-nav, ghost hovers, default button fills, and `animate-in/fade-in/zoom-in` animations. Token fill is additive/safe — tailwind-merge keeps explicit `bg-indigo-600` overrides. **This is done and verified to build.**

---

## DONE — session 1 (already on disk)

1. `PRODUCT.md` (new) — register=product.
2. **Design-token layer installed** — `globals.css` rewritten (full shadcn HSL token set mapped to slate-950/indigo-600), `tailwind.config.ts` rewritten (`darkMode: class`, tokens via `hsl(var(--x))`, `tailwindcss-animate` plugin), `tailwindcss-animate` installed (`--legacy-peer-deps` REQUIRED).
3. Banned **gradient text removed** (`page.tsx` h1, `f/[token]/page.tsx` h1 → solid `text-white`).
4. Dead `glass` class removed from `ChatInput.tsx`.
5. Debug logging stripped from `dashboard/page.tsx`.
6. Public form `f/[token]/page.tsx`: `alert()` → inline per-question errors + smooth-scroll to first unanswered, inline submit-error banner, `submitting` loading state.
7. `FormRenderer.tsx`: `yes_no` buttons `type="button"` (was submitting form early); `inv-color-scheme` defined.

## DONE — session 2 (already on disk, uncommitted)

**Verification (run BEFORE the session-2 edits below — must re-run):**
- `tailwindcss-animate` confirmed in package.json + node_modules. ✓
- `npx tsc --noEmit` → **green** (exit 0). ✓
- `npm run build` → **green**; Tailwind compiled tokens + plugin; all 11 routes built. ✓
- `npm run lint` → fails, but **`next.config.mjs` has `eslint.ignoreDuringBuilds: true`** so lint never blocks the build. Remaining lint = pre-existing `any` + `exhaustive-deps` warnings (see below).

**Toast + Confirm system (root-cause fix for the 9 scattered `alert()`/`confirm()` calls):**
- **NEW `frontend/src/components/ui/toast.tsx`** — `ToastProvider` + `useToast()`. API: `toast(msg)`, `toast.success`, `toast.error`, `toast.info`, each `(title, { description? })`. Bottom-right stack, auto-dismiss 4s, dismiss button, `role="status"` + `aria-live="polite"`, `motion-safe:` enter/exit animations (reduced-motion respected), `z-[60]` (above dialog `z-50`). On-brand slate-900/slate-800/indigo.
- **NEW `frontend/src/components/ui/confirm.tsx`** — `ConfirmProvider` + `useConfirm()`. Imperative promise-based: `const ok = await confirm({ title, description, confirmLabel, destructive })`. Built on existing `ui/dialog.tsx` (base-ui). Backdrop/Escape resolves false. Destructive variant = red confirm button.
- **`layout.tsx`** — mounted inside ThemeProvider: `<ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider>`.

**Call sites wired (all 9 alert/confirm removed):**
- `Sidebar.tsx` — `window.confirm` → `useConfirm` (destructive); failure `alert` → `toast.error`; added `toast.success("Form deleted")`. Bumped `slate-500`/`slate-600` labels → `slate-400` (AA).
- `dashboard/forms/page.tsx` — `confirm()` → `useConfirm` (destructive); added toast on toggle success/failure + delete success/failure (toggle/delete were silently failing); escaped `haven&apos;t`; `slate-500` → `slate-400`.
- `forms/[id]/page.tsx` — save success/failure `alert` → toast; download failure `alert` → toast; removed unused `Question` import; rebuilt bare "Form not found" into a proper Sidebar + message + "Back to workspace" state.
- `create/preview/page.tsx` — 3 publish `alert`s → `toast.error`; typed the catch via `axios.isAxiosError` (removed `err: any`); subtitle `slate-500` → `slate-400`.

**Other polish (session 2):**
- `create/page.tsx` — stripped verbose debug logging (`console.info` ×2, structured `console.error`, unused `requestStartedAt`). Generate handler now matches `dashboard/page.tsx`.
- `FormRenderer.tsx` — removed dead `rating`/`setRating` state + `useState` import; **rating stars are now keyboard-accessible** (`<button role="radio" aria-checked aria-label>` wrapping the Star, focus-visible ring). Real a11y fix on the trust-critical public form.
- `FormCard.tsx` — removed unused `Share2` import.
- `FieldSelector.tsx` — removed unused `FIELD_IDS`.
- `f/[token]/page.tsx` — removed unused `useRouter` + `Question` imports; `catch (err)` → `catch` (was unused).
- `dashboard/page.tsx` — escaped `I&apos;ll`; subtitle `slate-500` → `slate-400`.
- `forms/[id]/responses/page.tsx` — `slate-500` → `slate-400` across count, empty state, all in-card data labels + question labels (were failing AA on slate-900); rebuilt bare "Form not found" state. **(Plus the dangling `useToast` import — see ⚠️ above.)**

---

## DONE — session 3 (on disk, uncommitted)

**Verification (re-run AFTER session-3 edits — all green):**
- `npx tsc --noEmit` → **green** (exit 0). ✓
- `npm run build` → **green**; all 11 routes built. ✓
- `npm run lint` → fails, but **build ignores lint** (`next.config.mjs` `eslint.ignoreDuringBuilds: true`). Remaining = pre-existing `any` + `exhaustive-deps` only (see "Intentional remaining lint" below).

**Bug fix (regression caught by re-running verification — NOT a green tsc):**
- **`ui/toast.tsx`** — `tsc` was failing with `error TS2345: Argument of type 'number' is not assignable to parameter of type 'Timeout'`. Root cause: the `timers` ref was typed `Map<number, ReturnType<typeof setTimeout>>`, and in this Node-aware environment `ReturnType<typeof setTimeout>` resolves to Node's `Timeout` (not the DOM `number`), so storing `window.setTimeout(...)` failed. **Fix:** pinned the map type to `Map<number, number>` (the actual browser `window.setTimeout` return type; `clearTimeout` accepts it). This would have failed the Next build too (Next runs tsc during build), so it was the real blocker.

**Remaining-polish items from session 2 — resolved this session:**
- **Dead-code cleanup:** `ResponseTable.tsx` deleted. It was never imported anywhere (responses render inline in `forms/[id]/responses/page.tsx`). Confirmed `date-fns` is still used by `FormCard.tsx` (left the dep); `ui/table` left in place as a generic primitive.
- **Sidebar active-nav wayfinding + a11y:** the two top nav buttons (`AI Workspace`, `All Forms`) previously used `variant="secondary"` for the active state — a muted gray with no accent, weak as "current page" affordance and inconsistent with the indigo brand. Now: `variant="ghost"` always + on-brand active state (`bg-indigo-500/10 text-white` on the active route) + `aria-current="page"` for screen readers. Added `cn` import to support the conditional class.
- **Contrast misses the session-2 sweep missed (all AA failures on `slate-950`/`slate-900`):**
  - `Sidebar.tsx` — user email under the avatar: `slate-500` → `slate-400` in BOTH the desktop panel and the mobile Sheet (session 2 caught the other slate-500s here, missed these two).
  - `f/[token]/page.tsx` — two footer micro-copy lines (`text-xs text-slate-600`, ~3.65:1 on slate-950, below AA) bumped to `slate-500`: the "Built with FormAI" success-screen attribution and the "Never submit passwords…" footer.

---

## ⚠️ Gotchas

- **npm installs need `--legacy-peer-deps`** (`@clerk/nextjs@7.2.7` peer-wants Next 15/16; project on 14.2.35). Pre-existing.
- **Build ignores ESLint** (`next.config.mjs`), so a red `npm run lint` does NOT mean a broken build. Build truth = `npm run build`.
- **App is effectively dark-only**; tokens live at `:root` (not split `.dark`). Don't "fix" without intent.
- Token fill is additive/safe — won't override hard-coded `bg-indigo-600`.
- RTK (global CLAUDE.md): prefix shell with `rtk` where useful (`rtk tsc`, `rtk next build`).

---

## ✅ Verification — DONE (session 3, all green)

1. `cd frontend && npx tsc --noEmit` → **green** (exit 0). ✓ (Also caught the `toast.tsx` Timeout regression above.)
2. `cd frontend && npm run lint` → fails on pre-existing `any` + `exhaustive-deps` only (build-ignored — see Intentional lint below). No NEW errors introduced.
3. `cd frontend && npm run build` → **green**; all 11 routes built. ✓
4. **Browser check (flagship needs real evidence — STILL NOT RUN, no browser in the env):**
   - Toast: delete/save/publish/toggle/export → toast appears bottom-right, auto-dismisses ~4s, dismiss (X) works, stacks, fades/slides (and is instant under reduced-motion).
   - Confirm dialog: deleting from **Sidebar** and **All Forms** opens the dialog (not `window.confirm`); red "Delete form" button; Escape + backdrop click cancel; confirm proceeds + success toast.
   - Rating stars (public form): Tab to them, arrow/Enter/Space selects, focus ring visible.
   - **NEW (session 3): Sidebar active nav** — `/dashboard` and `/dashboard/forms` buttons show indigo-tinted active state (`bg-indigo-500/10 text-white`), non-active stays ghost.
   - Sidebar **active nav** highlighted (the session-1 token fix); ghost hovers visible.
   - Public form `/f/<token>`: empty submit → inline required + smooth scroll; Yes/No don't submit; date icon visible; success `scale-in`.
   - Dashboard quick-prompt chips animate in; dialog/dropdown/select open-close animations fire.
   - Re-check `slate-400` body on slate-900/950 still reads (it computes ~5.4–6.1:1, AA pass).

**Do not commit until the browser check passes.** Nothing is committed.

---

## NOT yet done — Remaining polish opportunities

1. ~~**`ResponseTable.tsx` is DEAD CODE**~~ — **DELETED in session 3.** Done.
2. **Intentional remaining `any` lint** (build-ignored, left on purpose, revisit only if going for zero-lint):
   - `FormRenderer.tsx` `value: any` / `onChange` — genuinely dynamic form values; typing as `unknown` cascades casts into every input.
   - `f/[token]/page.tsx` `Record<string, any>` (responses/personalInfo) — dynamic form data.
   - `dashboard/page.tsx` + `create/page.tsx` generate `catch (err: any)` — kept identical across the two sibling files (consistency); accesses `err.name`.
   - `ui/sheet.tsx` — pre-existing primitive, untouched.
   - `exhaustive-deps` warnings on `useEffect` in forms/responses/sidebar — pre-existing; intentional one-shot fetches.
3. **`f/[token]` personal-info** still uses native `required` (browser bubbles) while questions use inline errors — minor one-voice inconsistency. Optional: unify to inline validation. (Session 3: left as-is — native `required` works fine on a respondent-facing surface and unifying is a meaningful refactor for little UX gain.)
4. **Landing `app/page.tsx`** — brand-register-ish (identical-card feature grid, numbered "Three Simple Steps"). Acceptable; low-priority marketing surface. Only touch in a dedicated brand pass.
5. **Consistency sweep** — session 3 covered: Sidebar active-nav indigo + aria-current, the missed Sidebar email contrast, public-form footer contrast. Still open: a full button-vocabulary audit across all pages, 44px touch targets on mobile, a final pass of `focus-visible` rings everywhere (now that `--ring` exists).
6. Consider a **success toast on copy-link** in `forms/[id]` — currently an inline `Check` swap, which is fine; toast would unify but is optional.

---

## Quick reference — read first when resuming

1. `POLISH_HANDOFF.md` (this file) — note the ⚠️ first-fix.
2. `PRODUCT.md`
3. `frontend/src/components/ui/toast.tsx` + `ui/confirm.tsx` (the new feedback system — reuse, don't reinvent)
4. `frontend/src/app/globals.css` + `frontend/tailwind.config.ts` (token system)
5. `frontend/src/app/f/[token]/page.tsx` (inline-error pattern reference)
