import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, requireRoles } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { listLeads, createLead, updateLead, deleteLead, setStatus, bulkDelete, acceptDealer } from '../controllers/leadsController.js';

const router = Router();

// list with optional filters
router.get('/', [
  query('q').optional().isString(),
  query('status').optional().isIn(['New','In Review','Qualified','Closed']),
  query('type').optional().isIn(['Prototype','Dealer','Media','Other']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
], validate, listLeads);

// create (public or guarded depending on your policy). For now require auth admin/marketing
router.post('/', authenticate, requireRoles('admin','marketing'), [
  body('name').isString().notEmpty(),
  body('email').isEmail(),
  body('type').isIn(['Prototype','Dealer','Media','Other']),
  body('status').optional().isIn(['New','In Review','Qualified','Closed'])
], validate, createLead);

// accept dealer lead
router.post('/:id/accept-dealer', authenticate, requireRoles('admin','marketing'), acceptDealer);

// update
router.patch('/:id', authenticate, requireRoles('admin','marketing'), [
  body('name').optional().isString(),
  body('email').optional().isEmail(),
  body('type').optional().isIn(['Prototype','Dealer','Media','Other']),
  body('status').optional().isIn(['New','In Review','Qualified','Closed'])
], validate, updateLead);

// change status
router.patch('/:id/status', authenticate, requireRoles('admin','marketing'), [
  body('status').isIn(['New','In Review','Qualified','Closed'])
], validate, setStatus);

// delete single
router.delete('/:id', authenticate, requireRoles('admin','marketing'), deleteLead);

// bulk delete
router.post('/bulk-delete', authenticate, requireRoles('admin','marketing'), [
  body('ids').isArray({ min: 1 })
], validate, bulkDelete);

export default router;
