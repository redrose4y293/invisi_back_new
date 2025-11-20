import { Router } from 'express';
import { authenticate, requireRoles } from '../middlewares/auth.js';
import { listReports, getReport, deleteReport } from '../controllers/reportsController.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRoles('admin', 'dealer'), listReports);
router.get('/:id', getReport);
router.delete('/:id', requireRoles('admin'), deleteReport);

export default router;
