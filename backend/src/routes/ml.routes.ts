import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as mlController from '../controllers/ml.controller';

const router = Router();

router.post('/generate', requireAuth, mlController.generateForm);

export default router;
