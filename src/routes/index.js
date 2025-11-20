import { Router } from 'express';
import auth from './auth.js';
import users from './users.js';
import content from './content.js';
import uploads from './uploads.js';
import installations from './installations.js';
import reports from './reports.js';
import search from './search.js';
import leads from './leads.js';
import dealers from './dealers.js';
import files from './files.js';
import products from './products.js';
import admin from './admin.js';
import health from './health.js';
import dealerPortal from './dealerPortal.js';
import docs from './docs.js';

const router = Router();

router.use('/auth', auth);
router.use('/users', users);
router.use('/content', content);
router.use('/uploads', uploads);
router.use('/installations', installations);
router.use('/reports', reports);
router.use('/search', search);
router.use('/leads', leads);
router.use('/dealers', dealers);
router.use('/files', files);
router.use('/products', products);
router.use('/admin', admin);
router.use('/health', health);
router.use('/dealer', dealerPortal);
router.use('/docs', docs);

export default router;
