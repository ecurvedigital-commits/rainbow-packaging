import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { swaggerDocument } from './core/config/swagger.js';
import { corsOptions } from './core/config/cors.js';
import { requestLogger } from './core/middleware/requestLogger.js';
import { apiRateLimiter } from './core/middleware/rateLimiter.js';
import { xssSanitizer } from './core/middleware/xssSanitizer.js';
import { csrfProtection } from './core/middleware/csrfProtection.js';
import { apiRouter } from './routes/index.js';
import { notFound } from './core/middleware/notFound.js';
import { errorHandler } from './core/middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

/**
 * Builds and configures the Express application instance with production-grade security headers.
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  // Secure HTTP Headers via Helmet with customized Content-Security-Policy
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://apis.google.com',
            'https://www.gstatic.com',
            'https://*.firebaseio.com',
          ],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://*.googleusercontent.com',
            'https://fcm.googleapis.com',
            'https://validator.swagger.io',
          ],
          connectSrc: [
            "'self'",
            'https://*.googleapis.com',
            'https://fcm.googleapis.com',
            'https://*.firebaseio.com',
            'https://identitytoolkit.googleapis.com',
          ],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // XSS Protection (Input Sanitization) & CSRF Protection
  app.use(xssSanitizer);
  app.use(csrfProtection);

  // Serve static frontend files if built
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
  }

  // Swagger UI Documentation endpoints
  const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Rainbow Packages API Docs',
  };

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
  app.get('/docs.json', (_req, res) => res.json(swaggerDocument));

  // Apply rate limiter to general API routes
  app.use('/api/v1', apiRateLimiter, apiRouter);

  // SPA fallback: Return index.html for non-API routes when frontend build exists (Express 5 compatible)
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api') || req.path.startsWith('/docs')) {
      return next();
    }
    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });

  // 404 and Global Error Handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
