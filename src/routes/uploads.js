import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { getSignedUrlForUpload, completeUpload, getAsset } from '../controllers/uploadsController.js';

const router = Router();

router.post('/signed-url', authenticate, [
  body('filename').isString().notEmpty(),
  body('contentType').isString().notEmpty(),
  body('size').isInt({ min: 1 })
], validate, getSignedUrlForUpload);

router.post('/complete', authenticate, [
  body('objectKey').isString().notEmpty()
], validate, completeUpload);

router.get('/:id', authenticate, getAsset);

export default router;
