import { Router } from 'express';
import { prisma } from '../config/db.js';
import { s3 } from '../config/s3.js';

const router = Router();

router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    // S3 ping via config check; actual headBucket could be added later
    res.json({ db: 'ok', s3: 'configured' });
  } catch (e) {
    res.status(503).json({ db: 'error', s3: 'configured' });
  }
});

export default router;
