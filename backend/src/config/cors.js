import { env } from './env.js';

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || env.CORS_ORIGINS.includes(origin) || env.CORS_ORIGINS.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
