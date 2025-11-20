import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRoles, ownerOrAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { listUsers, createUser, getUser, updateUser, deleteUser } from '../controllers/usersController.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRoles('admin'), listUsers);

router.post('/', requireRoles('admin'), [
  body('email').isEmail(),
  body('displayName').isString().notEmpty(),
  body('roles').optional().isArray()
], validate, createUser);

router.get('/:id', ownerOrAdmin('id'), getUser);

router.patch('/:id', ownerOrAdmin('id'), [
  body('email').optional().isEmail(),
  body('displayName').optional().isString(),
  body('roles').optional().isArray(),
  body('password').optional().isString().isLength({ min: 8 })
], validate, updateUser);

router.delete('/:id', requireRoles('admin'), deleteUser);

export default router;
