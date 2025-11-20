import { Router } from 'express';
import { search, suggest } from '../controllers/searchController.js';

const router = Router();

router.get('/', search);
router.get('/suggest', suggest);

export default router;
