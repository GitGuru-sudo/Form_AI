# Accessibility pass

> Status: Not started. Effort: M. Area: Platform & quality.

## Goal
Run a concrete audit-and-fix pass over the frontend for keyboard navigation, ARIA labels on icon-only controls, form-label associations, dialog/toast focus management, color contrast, a skip link, and the document `lang` attribute. Most heavy lifting (focus trapping in dialogs, `aria-live` toasts, slate-400 contrast) is already handled; this plan closes the remaining gaps and provides a checklist for the rest. Test with axe DevTools.

## Dependencies to install
None for fixes. For auditing, install the **axe DevTools** browser extension (Chrome/Firefox) and run it against each route.

## Files touched
- `frontend/src/app/layout.tsx` — edit — add a skip link target / confirm `lang`.
- `frontend/src/components/Sidebar.tsx` — edit — `aria-label` on icon-only mobile menu trigger.
- Icon-only `<Button size="icon">` instances across editor/sidebar — edit — add `aria-label`.
- (audit-only) other routes — verified against the checklist table.

## Current state (verified)
- `app/layout.tsx` already sets `<html lang="en" suppressHydrationWarning>` — **good**, keep it.
- Toasts (`ui/toast.tsx`) already use `role="region" aria-label="Notifications" aria-live="polite"` and a labeled dismiss button — **good**.
- The confirm dialog (`ui/confirm.tsx`) is built on base-ui `Dialog`, which handles focus trap, `Escape`, and focus return — **good**. It also `autoFocus`es the confirm button.
- Public form (`f/[token]/page.tsx`): required questions use `role="alert"`, the `*` marker is `aria-hidden`, and `scroll-mt-24` focuses the first missing question — **good**. But personal-info `<Label>`/`<Input>` pairs are not explicitly associated (see Fix 3).
- Sidebar delete button already has `aria-label={`Delete ${form.title}`}` — **good**. The mobile `<Button variant="ghost" size="icon">` menu trigger has **no** label (see Fix 1).
- Per the polish handoff, slate-400-on-slate-900 body text was already brought to AA — re-verify with axe, don't re-fix blindly.

## Step-by-step

### Fix 1 — Label the icon-only mobile menu trigger (`Sidebar.tsx`)
**Find**:
```tsx
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
```
**Replace with**:
```tsx
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <Menu className="h-6 w-6" aria-hidden="true" />
            </Button>
          </SheetTrigger>
```

### Fix 2 — Add a skip link (`app/layout.tsx`)
Give keyboard users a way to jump past the sidebar to main content. The skip link is visually hidden until focused.

**Find**:
```tsx
        <body className={`${inter.className} antialiased`}>
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
        </body>
```
**Replace with**:
```tsx
        <body className={`${inter.className} antialiased`}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Skip to content
          </a>
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
        </body>
```
Then add the matching target id to the dashboard's `<main>` (`app/dashboard/page.tsx`):
**Find**:
```tsx
      <Sidebar />
      <main className="flex-1 flex flex-col">
```
**Replace with**:
```tsx
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col">
```
> Apply the same `id="main-content"` to the primary `<main>` of any other top-level route layout that includes the `Sidebar`. If `sr-only` / `not-sr-only` utilities aren't present, they ship with Tailwind by default — no config change needed.

### Fix 3 — Associate personal-info labels with inputs (`f/[token]/page.tsx`)
The personal-info `<Label>`/`<Input>` pairs render adjacent but aren't linked by `htmlFor`/`id`. Add matching ids. Example for the Full Name field:

**Find**:
```tsx
              {form.collectFullName && (
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    required 
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentName: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
```
**Replace with**:
```tsx
              {form.collectFullName && (
                <div className="space-y-2">
                  <Label htmlFor="pi-name">Full Name</Label>
                  <Input 
                    id="pi-name"
                    required 
                    onChange={(e) => setPersonalInfo(p => ({...p, respondentName: e.target.value}))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              )}
```
Apply the same `htmlFor`/`id` pairing to the remaining personal-info fields: `pi-email`, `pi-phone`, `pi-age`, `pi-dob`, `pi-gender`. For the dynamic questions, the `<Label>` already sits above a `FormRenderer`; if `FormRenderer`'s control accepts an `id`, pass `id={\`q-input-${q.questionId}\`}` and set `htmlFor` to match — otherwise wrap so the label's `htmlFor` targets the rendered control.

### Fix 4 — Audit other icon-only buttons in the editor/sidebar
Search for icon-only buttons missing a label:
```bash
rtk grep -rn "size=\"icon\"" frontend/src
```
For each hit where the button has only an icon child and no `aria-label`, add one describing the action (verb + object), e.g.:
```tsx
<Button size="icon" aria-label="Add question"><Plus className="h-4 w-4" aria-hidden="true" /></Button>
<Button size="icon" aria-label="Remove question"><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
<Button size="icon" aria-label="Duplicate question"><Copy className="h-4 w-4" aria-hidden="true" /></Button>
```
Also mark the inner icon `aria-hidden="true"` so it isn't double-announced.

## Checklist (audit the rest with axe DevTools)

| Area | Check | Status / action |
|---|---|---|
| `lang` attribute | `<html lang="en">` present | Done — keep in `layout.tsx` |
| Skip link | Jump-to-content link, visible on focus | Fix 2 |
| Icon-only buttons | All have `aria-label`; icons `aria-hidden` | Fix 1, Fix 4 — grep `size="icon"` |
| Form labels | Every input has an associated label (`htmlFor`/`id` or wrapping) | Fix 3 + remaining PI fields |
| Focus-visible rings | Interactive elements show a visible focus ring (now that `--ring` exists) | Verify; ensure no `focus:outline-none` without a `focus-visible:ring-*` replacement |
| Dialog focus | Focus trapped, returns to trigger, `Escape` closes | Done — base-ui `Dialog` (confirm.tsx) |
| Toast announcements | `aria-live` region announces toasts | Done — `ui/toast.tsx` |
| Required-field errors | Errors announced + first error focused | Done — `role="alert"` + `scroll-mt-24` in public form |
| Color contrast | Body/secondary text ≥ AA on dark bg | Re-verify slate-400 on slate-900/950 with axe (reportedly already AA) |
| Keyboard nav order | Tab order is logical; honeypot not focusable | Verify; honeypot is `tabIndex={-1}` (see [[spam-bot-protection]]) |
| Headings | Single `<h1>` per page, logical nesting | Audit per route |
| Images/icons | Decorative icons hidden; meaningful ones labeled | Covered by icon-button fixes |

## Edge cases & notes
- **Don't remove focus rings**: any `focus:outline-none` must be paired with a `focus-visible:ring-2 focus-visible:ring-indigo-500` (the pattern already used in `toast.tsx`/`confirm.tsx`). Removing the outline without a replacement is a regression.
- **base-ui dialogs** already manage focus; do not add manual focus traps on top — they conflict.
- **Decorative `*`** in the public form is correctly `aria-hidden`; the "This question is required." `role="alert"` carries the real meaning. Keep both.
- Contrast was reportedly addressed in the polish pass — verify with axe rather than darkening text again (over-correcting hurts the intended dark aesthetic).

## Verification
- `cd frontend && rtk tsc` → no type errors.
- `cd frontend && rtk npm run build` → passes.
- Run **axe DevTools** on: `/dashboard`, `/dashboard/forms`, the form editor, `/create/preview`, and a public `/f/:token` — target **zero critical/serious** violations.
- Keyboard-only pass: Tab from page load → skip link appears first → activating it moves focus into `#main-content`. Tab reaches every control (including the mobile menu trigger, now labeled) and never lands on the honeypot.
- Screen reader spot check (VoiceOver/NVDA): icon-only buttons announce their `aria-label`; toasts are announced; the confirm dialog traps and returns focus.
- `rtk grep -rn "size=\"icon\"" frontend/src` → every result has an `aria-label`.
