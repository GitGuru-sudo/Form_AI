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
