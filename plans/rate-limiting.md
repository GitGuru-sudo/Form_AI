# Rate limiting (public endpoints)

> Status: Not started. Effort: S. Area: Platform & quality.

## Goal
Protect the two unauthenticated public endpoints — `POST /api/f/:token/submit` (write/abuse surface) and `GET /api/f/:token` (read) — from abuse using `express-rate-limit`. Add a strict limiter on submit, a looser one on reads, and an optional global fallback. Respect Express 5 and the proxy/IP situation in production.

## Dependencies to install
```bash
cd backend && npm install express-rate-limit --legacy-peer-deps
```
`express-rate-limit` v7+ is Express 5 compatible and ships its own types (no `@types` needed).

## Files touched
- `backend/src/middleware/rateLimit.middleware.ts` — new — strict + read + global limiters.
- `backend/src/routes/responses.routes.ts` — edit — wire limiters onto the public routes only.
- `backend/src/index.ts` — edit — `app.set('trust proxy', 1)` and an optional global fallback limiter.

## Step-by-step

### Step 1 — Limiter middleware (`backend/src/middleware/rateLimit.middleware.ts`)
Create `backend/src/middleware/rateLimit.middleware.ts` with full contents:
```ts
import rateLimit from 'express-rate-limit';
import logger from '../lib/logger';

// Local dev convenience: set DISABLE_RATE_LIMIT=true in backend/.env to turn the
// limiters into pass-throughs while developing against the public form.
const disabled = process.env.DISABLE_RATE_LIMIT === 'true';

const passthrough = (_req: unknown, _res: unknown, next: () => void) => next();

const sharedOptions = {
  standardHeaders: 'draft-7' as const, // RateLimit-* response headers
  legacyHeaders: false,
};

// Strict: public form submissions. A single respondent should never need many
// submits; this blunts spam/bot floods against POST /api/f/:token/submit.
export const submitLimiter = disabled
  ? passthrough
  : rateLimit({
      ...sharedOptions,
      windowMs: 10 * 60 * 1000, // 10 minutes
      limit: 8, // max 8 submissions per IP per window
      message: { message: 'Too many submissions. Please wait a few minutes and try again.' },
      handler: (req, res, _next, options) => {
        logger.warn('rate limit hit (submit)', { ip: req.ip, path: req.path });
        res.status(options.statusCode).json(options.message);
      },
    });

// Looser: public form reads. GET /api/f/:token is cheap but still scrapeable.
export const readLimiter = disabled
  ? passthrough
  : rateLimit({
      ...sharedOptions,
      windowMs: 5 * 60 * 1000, // 5 minutes
      limit: 100, // max 100 reads per IP per window
      message: { message: 'Too many requests. Please slow down.' },
      handler: (req, res, _next, options) => {
        logger.warn('rate limit hit (read)', { ip: req.ip, path: req.path });
        res.status(options.statusCode).json(options.message);
      },
    });

// Optional global fallback for the whole API (defense in depth). Generous so it
// never trips normal authenticated dashboard usage.
export const globalLimiter = disabled
  ? passthrough
  : rateLimit({
      ...sharedOptions,
      windowMs: 60 * 1000, // 1 minute
      limit: 300, // max 300 requests per IP per minute
      message: { message: 'Too many requests. Please slow down.' },
    });
```

### Step 2 — Wire limiters onto the public routes only (`backend/src/routes/responses.routes.ts`)
The protected routes stay as-is (they're already behind `requireAuth` + Clerk). Only the two public routes get limiters.

**Find** (the whole file):
```ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as responsesController from '../controllers/responses.controller';

const router = Router();

// Protected routes
router.get('/forms/:id/responses', requireAuth, responsesController.getResponses);
router.get('/forms/:id/responses/export', requireAuth, responsesController.exportResponses);

// Public routes
router.get('/f/:token', responsesController.getPublicForm);
router.post('/f/:token/submit', responsesController.submitResponse);

export default router;
```
**Replace with**:
```ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { submitLimiter, readLimiter } from '../middleware/rateLimit.middleware';
import * as responsesController from '../controllers/responses.controller';

const router = Router();

// Protected routes
router.get('/forms/:id/responses', requireAuth, responsesController.getResponses);
router.get('/forms/:id/responses/export', requireAuth, responsesController.exportResponses);

// Public routes (unauthenticated — rate limited)
router.get('/f/:token', readLimiter, responsesController.getPublicForm);
router.post('/f/:token/submit', submitLimiter, responsesController.submitResponse);

export default router;
```

### Step 3 — Trust proxy + optional global limiter (`backend/src/index.ts`)
`express-rate-limit` keys on `req.ip`. Behind a proxy/load balancer (Render, Railway, Nginx, Cloudflare), `req.ip` is the proxy unless Express trusts the `X-Forwarded-For` header. Set a **specific** hop count (`1`), not `true`, so the limiter can't be trivially spoofed.

**Find**:
```ts
const app = express();
const PORT = process.env.PORT || 8000;
```
**Replace with**:
```ts
const app = express();
const PORT = process.env.PORT || 8000;

// Behind exactly one proxy in production (load balancer / Cloudflare), so req.ip
// reflects the real client for rate limiting. Use a number, never `true`
// (trusting all hops lets clients spoof X-Forwarded-For to dodge limits).
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

(Optional) Add the global fallback limiter. Place it **after** `clerkMiddleware()` and **before** the route mounts so it covers every API route.

**Find**:
```ts
app.use(clerkMiddleware());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/forms', formsRoutes);
```
**Replace with**:
```ts
app.use(clerkMiddleware());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

import('./middleware/rateLimit.middleware').then(({ globalLimiter }) => {});
app.use(globalLimiter);

app.use('/api/forms', formsRoutes);
```
> Simpler alternative (preferred): add a top-of-file import instead of the dynamic `import(...)` line above:
> ```ts
> import { globalLimiter } from './middleware/rateLimit.middleware';
> ```
> and then just `app.use(globalLimiter);` before the route mounts. Use the static import; the dynamic form above is only shown to make the placement unambiguous. Health check stays above the limiter so monitoring is never throttled.

Final intended `index.ts` region:
```ts
import { globalLimiter } from './middleware/rateLimit.middleware'; // with the other imports at top
// ...
app.use(clerkMiddleware());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(globalLimiter);

app.use('/api/forms', formsRoutes);
app.use('/api', responsesRoutes);
app.use('/api/ml', mlRoutes);
```

## Edge cases & notes
- **Express 5**: `express-rate-limit` v7 supports Express 5; its middleware is synchronous-returning, so no async-error-propagation concerns here.
- **Local dev**: set `DISABLE_RATE_LIMIT=true` in `backend/.env` to make all limiters pass-throughs — useful when load-testing the public form locally.
- **Submit limiter window**: 8 per 10 min per IP is intentionally tight for a public form. If legitimate kiosk/shared-IP usage is expected, raise `limit` or key on a combination (out of scope here).
- **Headers**: `standardHeaders: 'draft-7'` emits `RateLimit-*` headers so the frontend could show remaining quota; not required.
- **In-memory store**: default store is per-process memory. Fine for a single instance. If you scale horizontally, swap in a shared store (Redis) later — out of scope.
- The frontend already maps HTTP 429 to "Too many requests. Please slow down and try again." in `getErrorMessage` (see [[optimistic-ui-error-boundaries]]), so submit throttling surfaces cleanly via toast.

## Verification
- `cd backend && rtk tsc --noEmit` → no type errors.
- Manual (limiter on): hammer the submit endpoint past the limit:
  ```bash
  for i in $(seq 1 12); do rtk curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/f/TESTTOKEN/submit -H "Content-Type: application/json" -d '{"answers":[]}'; done
  ```
  Expect `404`/`400` for the first 8 (form-not-found / validation), then `429` once the window limit is hit.
- Manual (read): `rtk curl -i http://localhost:8000/api/f/TESTTOKEN` → response includes `RateLimit-*` headers.
- With `DISABLE_RATE_LIMIT=true`, the same loop returns no `429`.
- Confirm `/health` is never throttled even under the global limiter (it's registered before `app.use(globalLimiter)`).
