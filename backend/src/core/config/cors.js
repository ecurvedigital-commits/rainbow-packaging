import { env } from './env.js';

export const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow same-origin / non-CORS requests (direct static assets, curl, mobile clients)
    if (!origin) {
      return callback(null, true);
    }

    const lowerOrigin = origin.toLowerCase();
    const allowedList = Array.isArray(env.CORS_ORIGINS)
      ? env.CORS_ORIGINS.map((o) => o.toLowerCase())
      : [];

    // 2. Allow explicitly configured origins, wildcard, or staging deployments
    if (
      allowedList.includes(lowerOrigin) ||
      allowedList.includes('*') ||
      lowerOrigin.endsWith('.netlify.app') ||
      lowerOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    // 3. In development, allow localhost and 127.0.0.1 on any port (5000, 5173, etc.)
    if (env.NODE_ENV === 'development') {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(lowerOrigin);
      if (isLocalhost) {
        return callback(null, true);
      }
    }

    // 4. Gracefully decline without throwing an unhandled 500 error
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
