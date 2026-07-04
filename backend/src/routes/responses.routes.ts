import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { submitLimiter, readLimiter } from '../middleware/rateLimit.middleware';
import * as responsesController from '../controllers/responses.controller';

const router = Router();

// Protected routes
router.get('/forms/:id/responses', requireAuth, responsesController.getResponses);
router.get('/forms/:id/responses/partials', requireAuth, responsesController.getPartialStats);
router.get('/forms/:id/responses/export', requireAuth, responsesController.exportResponses);
router.get('/forms/:id/responses/export/csv', requireAuth, responsesController.exportResponsesCsv);
router.get('/forms/:id/responses/export/pdf', requireAuth, responsesController.exportResponsesPdf);

// Public routes (unauthenticated — rate limited)
router.get('/f/:token', readLimiter, responsesController.getPublicForm);
router.post('/f/:token/submit', submitLimiter, responsesController.submitResponse);
router.post('/f/:token/partial', responsesController.savePartialResponse);

export default router;
