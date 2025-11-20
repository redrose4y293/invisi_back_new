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
// Configure helmet to work with CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration with proper error handling
const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return cb(null, true);
    const allowed = config.corsOrigins;
    // If '*' is in allowed origins, allow all
    if (allowed.includes('*')) return cb(null, true);
    // Check if the origin is in the allowed list
    if (allowed.includes(origin)) return cb(null, true);
    // In development, log the blocked origin for debugging
    if (config.env === 'development') {
      console.log(`CORS blocked origin: ${origin}. Allowed origins:`, allowed);
    }
    // Return false to reject, but don't throw error to ensure proper response
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

// Global rate limit for safety
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
