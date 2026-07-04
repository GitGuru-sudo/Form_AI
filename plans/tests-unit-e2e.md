# Tests — unit & e2e

> Status: Not started. Effort: L. Area: Platform & quality.

## Goal
Stand up testing from zero. Backend: **Vitest** + **supertest** with unit tests for ML fallback logic and integration tests for `submitResponse` validation (requires exporting `app` from `index.ts`). Frontend: **Playwright** e2e covering the public form submit flow (no auth needed) plus form generation/preview. Per the global RTK rules these run as `rtk vitest run` and `rtk playwright test`.

## Dependencies to install
Backend:
```bash
cd backend && npm install -D vitest supertest @types/supertest --legacy-peer-deps
```
Frontend:
```bash
cd frontend && npm install -D @playwright/test --legacy-peer-deps
cd frontend && npx playwright install
```
(`npx playwright install` downloads browser binaries — required once.)

## Files touched
- `backend/src/index.ts` — edit — export `app` so supertest can import it without binding a port.
- `backend/vitest.config.ts` — new — Vitest config (node env).
- `backend/package.json` — edit — `test` script.
- `backend/src/controllers/__tests__/responses.test.ts` — new — supertest integration tests for the public submit/validation flow.
- `backend/src/services/__tests__/ml.service.test.ts` — new — unit test for ML fallback logic.
- `frontend/playwright.config.ts` — new — Playwright config.
- `frontend/e2e/public-form.spec.ts` — new — public form submit e2e.
- `frontend/package.json` — edit — `test:e2e` script (optional convenience).

## Step-by-step

### Step 1 — Export `app` from `index.ts` (small refactor)
supertest needs the Express `app` without it calling `app.listen`. Split the export from `startServer()`. Guard `startServer()` so it does not run under test.

**Find**:
```ts
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info('Server started', { port: PORT });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
};

startServer();
```
**Replace with**:
```ts
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info('Server started', { port: PORT });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
};

// Don't open a DB connection / bind a port when imported by tests.
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
export default app;
```

### Step 2 — Vitest config (`backend/vitest.config.ts`)
Create `backend/vitest.config.ts` with full contents:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    // Sets NODE_ENV=test so index.ts skips startServer() on import.
    env: { NODE_ENV: 'test' },
    // Integration tests stub the DB layer; no real Mongo needed.
    pool: 'forks',
  },
});
```

### Step 3 — Backend `test` script (`backend/package.json`)
**Find**:
```json
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
```
**Replace with**:
```json
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
```

### Step 4 — Integration test for `submitResponse` validation (`backend/src/controllers/__tests__/responses.test.ts`)
We test the controller's HTTP behavior through the real route stack. The Mongoose `Form`/`Response` models are mocked so no live database is required — we assert the validation branches (form-not-found, closed form, missing-required, happy path).

Create `backend/src/controllers/__tests__/responses.test.ts` with full contents:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock the Mongoose models BEFORE importing the app (hoisted by vitest).
vi.mock('../../models/form.model', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('../../models/response.model', () => {
  const ResponseModel: any = vi.fn().mockImplementation(function (this: any, doc: any) {
    Object.assign(this, doc);
    this.save = vi.fn().mockResolvedValue(undefined);
  });
  ResponseModel.find = vi.fn();
  return { default: ResponseModel };
});

import { app } from '../../index';
import Form from '../../models/form.model';

const mockedForm = Form as unknown as { findOne: ReturnType<typeof vi.fn> };

describe('POST /api/f/:token/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when the form does not exist', async () => {
    mockedForm.findOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/f/NOPE/submit')
      .send({ answers: [] });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('returns 403 when the form is closed', async () => {
    mockedForm.findOne.mockResolvedValueOnce({
      _id: 'f1',
      isActive: false,
      questions: [],
    });

    const res = await request(app)
      .post('/api/f/TKN/submit')
      .send({ answers: [] });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/closed/i);
  });

  it('returns 400 listing missing required question ids', async () => {
    mockedForm.findOne.mockResolvedValueOnce({
      _id: 'f1',
      isActive: true,
      questions: [
        { questionId: 'q1', questionText: 'Name', isRequired: true },
        { questionId: 'q2', questionText: 'Optional', isRequired: false },
      ],
    });

    const res = await request(app)
      .post('/api/f/TKN/submit')
      .send({ answers: [{ questionId: 'q2', questionText: 'Optional', answerText: 'hi' }] });

    expect(res.status).toBe(400);
    expect(res.body.questionIds).toContain('q1');
  });

  it('returns 201 and saves when required questions are answered', async () => {
    mockedForm.findOne.mockResolvedValueOnce({
      _id: 'f1',
      isActive: true,
      questions: [{ questionId: 'q1', questionText: 'Name', isRequired: true }],
    });

    const res = await request(app)
      .post('/api/f/TKN/submit')
      .send({
        respondentName: 'Ada',
        answers: [{ questionId: 'q1', questionText: 'Name', answerText: 'Ada' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/submitted/i);
  });

  it('coerces array answerText to a comma-joined string (no validation crash)', async () => {
    mockedForm.findOne.mockResolvedValueOnce({
      _id: 'f1',
      isActive: true,
      questions: [{ questionId: 'q1', questionText: 'Pick', isRequired: false }],
    });

    const res = await request(app)
      .post('/api/f/TKN/submit')
      .send({ answers: [{ questionId: 'q1', questionText: 'Pick', answerText: ['a', 'b'] }] });

    expect(res.status).toBe(201);
  });
});
```

> Note: `submitResponse` reads `req.ip` only in the spam plan's optional changes; the base controller does not, so these tests pass against the current code. If [[spam-bot-protection]] is applied first, add `_hp`/`_t` assertions here too.

### Step 5 — Unit test for ML fallback logic (`backend/src/services/__tests__/ml.service.test.ts`)
> Anchor the import path/function name to the real `ml.service`. Confirm the export name with:
> ```bash
> rtk grep -rn "export" backend/src/services
> ```
> The test below assumes a `generateFormFallback(prompt, questionCount)` style helper that returns a deterministic form when the AI provider is unavailable. Adjust names to match.

Create `backend/src/services/__tests__/ml.service.test.ts` with full contents:
```ts
import { describe, it, expect } from 'vitest';
// Adjust this import to the real export in backend/src/services/ml.service.ts
import { generateFormFallback } from '../ml.service';

describe('ml.service fallback', () => {
  it('returns the requested number of questions', () => {
    const form = generateFormFallback('customer feedback survey', 5);
    expect(form.questions).toHaveLength(5);
  });

  it('clamps/handles an out-of-range count gracefully', () => {
    const form = generateFormFallback('anything', 99);
    expect(form.questions.length).toBeGreaterThan(0);
    expect(form.questions.length).toBeLessThanOrEqual(10);
  });

  it('produces a non-empty title and well-formed questions', () => {
    const form = generateFormFallback('event RSVP', 3);
    expect(form.title.trim().length).toBeGreaterThan(0);
    for (const q of form.questions) {
      expect(typeof q.questionText).toBe('string');
      expect(q.questionText.trim().length).toBeGreaterThan(0);
    }
  });
});
```

### Step 6 — Playwright config (`frontend/playwright.config.ts`)
Create `frontend/playwright.config.ts` with full contents:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Spin up the dev server for local runs. Assumes the backend is already
  // running (or pointed at by NEXT_PUBLIC_API_URL) so /f/:token resolves.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### Step 7 — Public form e2e (`frontend/e2e/public-form.spec.ts`)
The public form needs **no Clerk auth**, so it's the cleanest golden-path e2e. Provide a real `shareToken` of an active form via `E2E_FORM_TOKEN`.

Create `frontend/e2e/public-form.spec.ts` with full contents:
```ts
import { test, expect } from '@playwright/test';

const TOKEN = process.env.E2E_FORM_TOKEN || 'REPLACE_WITH_REAL_TOKEN';

test.describe('public form', () => {
  test('renders an active form', async ({ page }) => {
    await page.goto(`/f/${TOKEN}`);
    // Submit button is the stable anchor for a loaded, open form.
    await expect(page.getByRole('button', { name: /submit response/i })).toBeVisible();
  });

  test('blocks submit when a required question is empty', async ({ page }) => {
    await page.goto(`/f/${TOKEN}`);
    await page.getByRole('button', { name: /submit response/i }).click();
    // Inline required error uses role="alert".
    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('submits successfully when filled', async ({ page }) => {
    await page.goto(`/f/${TOKEN}`);

    // Fill any required text inputs that are visible.
    const inputs = page.locator('form input[required], form textarea[required]');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const type = await el.getAttribute('type');
      if (type === 'email') await el.fill('e2e@example.com');
      else if (type === 'number') await el.fill('30');
      else if (type === 'date') await el.fill('2000-01-01');
      else await el.fill('E2E test value');
    }

    await page.getByRole('button', { name: /submit response/i }).click();
    await expect(page.getByRole('heading', { name: /thank you/i })).toBeVisible();
  });

  test('shows the closed state for an inactive form', async ({ page }) => {
    const closedToken = process.env.E2E_CLOSED_TOKEN;
    test.skip(!closedToken, 'E2E_CLOSED_TOKEN not set');
    await page.goto(`/f/${closedToken}`);
    await expect(page.getByRole('heading', { name: /this form is closed/i })).toBeVisible();
  });
});
```

### Step 8 — Frontend e2e script (optional, `frontend/package.json`)
**Find**:
```json
    "start": "next start",
    "lint": "next lint"
```
**Replace with**:
```json
    "start": "next start",
    "lint": "next lint",
    "test:e2e": "playwright test"
```

## Edge cases & notes
- **Clerk + e2e**: authenticated dashboard flows are hard to e2e because Clerk gates them. Prefer the public `/f/:token` flow (zero auth). If you must test authed flows, use Clerk's testing tokens / a seeded test user with `@clerk/testing` — out of scope here; documented as a caveat.
- **No real DB in unit/integration tests**: Step 4 mocks the Mongoose models, so tests run without Mongo and without network. This keeps `rtk vitest run` fast and deterministic. If you later want true integration tests, use `mongodb-memory-server`.
- **`NODE_ENV=test` guard** in `index.ts` is essential — without it, importing the app for supertest would call `connectDB()` and `app.listen()`.
- **ml.service anchor**: Step 5's import/function names are assumptions — grep the real service first and rename to match before running.
- **Express 5 async errors**: the controllers wrap everything in `try/catch` and `return res...`, so supertest sees proper status codes; no error-middleware is required for these tests.
- Playwright `webServer` starts `next dev`; ensure the backend is reachable (set `NEXT_PUBLIC_API_URL`) and `E2E_FORM_TOKEN` points at a real active form.

## Verification
- `cd backend && rtk tsc --noEmit` → no type errors (after exporting `app`).
- `cd backend && rtk vitest run` → all `responses.test.ts` cases pass; `ml.service.test.ts` passes once names match the real service.
- `cd frontend && rtk tsc` → no type errors.
- `cd frontend && E2E_FORM_TOKEN=<real-token> rtk playwright test` → public-form specs pass (renders, required-block, successful submit, optional closed-state).
- CI: `rtk vitest run` (backend) and `rtk playwright test` (frontend) as separate steps.
