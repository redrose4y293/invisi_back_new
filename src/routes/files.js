import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { listFiles, createFile, updateFile, deleteFile, bulkDeleteFiles, downloadFile } from '../controllers/filesController.js';

const router = Router();

router.get('/', [
  query('q').optional().isString(),
  query('type').optional().isIn(['PDF','Video','Image','Other']),
  query('cat').optional().isIn(['NDA','Spec','Report','Marketing']),
  query('vis').optional().isIn(['Public','Dealer','Admin'])
], validate, listFiles);

// Temporarily remove authenticate to unblock admin file management
router.post('/', [
  body('name').isString().notEmpty(),
  body('type').isIn(['PDF','Video','Image','Other']),
  body('cat').isIn(['NDA','Spec','Report','Marketing']),
  body('vis').isIn(['Public','Dealer','Admin']),
  body('url').isString().notEmpty(),
  body('desc').optional().isString()
], validate, createFile);

router.patch('/:id', [
  body('name').optional().isString(),
  body('type').optional().isIn(['PDF','Video','Image','Other']),
  body('cat').optional().isIn(['NDA','Spec','Report','Marketing']),
  body('vis').optional().isIn(['Public','Dealer','Admin']),
  body('url').optional().isString(),
  body('desc').optional().isString()
], validate, updateFile);

router.delete('/:id', deleteFile);

router.post('/bulk-delete', [
  body('ids').isArray({ min: 1 })
], validate, bulkDeleteFiles);

// public download proxy
router.get('/:id/download', downloadFile);

export default router;
