import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createInstallation, listInstallations, getInstallation, updateInstallation, attachReport } from '../controllers/installationsController.js';

const router = Router();

router.use(authenticate);

router.post('/', [
  body('siteName').isString().notEmpty(),
  body('address').optional(),
  body('customerInfo').optional(),
  body('scheduledAt').optional().isISO8601(),
  body('metadata').optional()
], validate, createInstallation);

router.get('/', listInstallations);
router.get('/:id', getInstallation);

router.patch('/:id', [
  body('status').optional().isIn(['created','scheduled','in_progress','completed','archived']),
  body('notes').optional().isString(),
  body('scheduleUpdate').optional().isISO8601()
], validate, updateInstallation);

router.post('/:id/reports', [
  body('uploadObjectKey').isString().notEmpty(),
  body('reportType').isString().notEmpty(),
  body('notes').optional().isString()
], validate, attachReport);

export default router;
