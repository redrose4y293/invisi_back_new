import { Router } from 'express';
import { authenticate, requireRoles } from '../middlewares/auth.js';
import { stats, events, impersonate } from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, requireRoles('admin'));

router.get('/stats', stats);
router.get('/events', events);
router.post('/users/:id/impersonate', impersonate);

export default router;
