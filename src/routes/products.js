import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, requireRoles } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { listProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productsController.js';

const router = Router();

router.get('/', [
  query('q').optional().isString(),
  query('status').optional().isIn(['Draft','Live','Archived'])
], validate, listProducts);

router.post('/', authenticate, requireRoles('admin','marketing'), [
  body('name').isString().notEmpty(),
  body('slug').isString().notEmpty(),
  body('status').optional().isIn(['Draft','Live','Archived'])
], validate, createProduct);

router.patch('/:id', authenticate, requireRoles('admin','marketing'), [
  body('name').optional().isString(),
  body('slug').optional().isString(),
  body('status').optional().isIn(['Draft','Live','Archived'])
], validate, updateProduct);

router.delete('/:id', authenticate, requireRoles('admin','marketing'), deleteProduct);

export default router;
