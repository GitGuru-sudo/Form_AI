import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as formsController from '../controllers/forms.controller';

const router = Router();

router.post('/', requireAuth, formsController.createForm);
router.get('/', requireAuth, formsController.getForms);
router.get('/:id', requireAuth, formsController.getFormById);
router.patch('/:id', requireAuth, formsController.updateForm);
router.patch('/:id/toggle', requireAuth, formsController.toggleFormStatus);
router.delete('/:id', requireAuth, formsController.deleteForm);

export default router;
