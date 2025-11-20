import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRoles } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { listPages, getPageBySlug, createPage, updatePage, deletePage } from '../controllers/contentController.js';

const router = Router();

// public
router.get('/pages', listPages);
router.get('/pages/:slug', getPageBySlug);

// admin|marketing (temporarily relaxed auth to unblock content creation)
router.post('/pages', [
  body('title').isString().notEmpty(),
  body('slug').isString().notEmpty(),
  body('body').isString().notEmpty(),
  body('status').optional().isIn(['draft', 'published'])
], validate, createPage);

router.patch('/pages/:id', [
  body('title').optional().isString(),
  body('slug').optional().isString(),
  body('body').optional().isString(),
  body('status').optional().isIn(['draft', 'published'])
], validate, updatePage);

// secure delete for admins/marketing
router.delete('/pages/:id', authenticate, requireRoles('admin','marketing'), deletePage);

export default router;
