import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './src/config/env.js';
import { notFound, errorHandler } from './src/utils/errors.js';
import apiRouter from './src/routes/index.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: (origin, cb) => {
  if (!origin) return cb(null, true);
  const allowed = config.corsOrigins;
  if (allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
  return cb(new Error('CORS not allowed'), false);
}}));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

// Global rate limit for safety
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
