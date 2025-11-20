import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { dealerListFiles, dealerUpload, dealerListUploads, dealerTraining, dealerRegisterTraining, dealerLogin, dealerApply } from '../controllers/dealerPortalController.js';

const router = Router();

router.post('/login', [
  body('email').isEmail(),
  body('phone').optional().isString()
], validate, dealerLogin);

// Public dealer application (no auth)
router.post('/apply', [
  body('name').isString().notEmpty(),
  body('email').isEmail(),
  body('phone').optional().isString(),
  body('company').optional().isString(),
  body('country').optional().isString(),
  body('message').optional().isString(),
], validate, dealerApply);

router.get('/files', authenticate, [
  query('q').optional().isString(),
  query('type').optional().isIn(['all','pdf','docx','zip','image','other'])
], validate, dealerListFiles);

router.post('/upload', authenticate, [
  body('name').isString().notEmpty(),
  body('category').isIn(['Testing Report','Marketing','Certification']),
  body('description').optional().isString()
], validate, dealerUpload);

router.get('/uploads', authenticate, dealerListUploads);

// Public read for trainings (temporary to unblock UI); registration remains auth-protected
router.get('/training', dealerTraining);

router.post('/training/register', authenticate, [
  body('eventId').isString().notEmpty(),
  body('note').optional().isString()
], validate, dealerRegisterTraining);

export default router;
