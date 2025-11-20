import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, requireRoles } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { listDealers, createDealer, updateDealer, setDealerStatus, deleteDealer, bulkDeleteDealers, approveDealer, getDealerDetail } from '../controllers/dealersController.js';

const router = Router();

router.get('/', [
  query('q').optional().isString(),
  query('status').optional().isIn(['Pending','Active','Suspended']),
  query('region').optional().isString()
], validate, listDealers);

router.post('/', authenticate, requireRoles('admin','marketing'), [
  body('org').isString().notEmpty(),
  body('contactName').isString().notEmpty(),
  body('email').isEmail(),
  body('region').isString().notEmpty(),
], validate, createDealer);

router.patch('/:id', authenticate, requireRoles('admin','marketing'), [
  body('org').optional().isString(),
  body('contactName').optional().isString(),
  body('contactEmail').optional().isEmail(),
  body('region').optional().isString(),
  body('status').optional().isIn(['Pending','Active','Suspended']),
  body('users').optional().isInt()
], validate, updateDealer);

router.patch('/:id/status', authenticate, requireRoles('admin','marketing'), [
  body('status').isIn(['Pending','Active','Suspended'])
], validate, setDealerStatus);

// approve dealer and create/upgrade dealer user
router.post('/:id/approve', authenticate, requireRoles('admin','marketing'), approveDealer);

// detail
router.get('/:id/detail', authenticate, requireRoles('admin','marketing'), getDealerDetail);

router.delete('/:id', authenticate, requireRoles('admin','marketing'), deleteDealer);

router.post('/bulk-delete', authenticate, requireRoles('admin','marketing'), [
  body('ids').isArray({ min: 1 })
], validate, bulkDeleteDealers);

export default router;
