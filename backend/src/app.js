import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { swaggerDocument } from './config/swagger.js';
import { corsOptions } from './config/cors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { apiRouter } from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

/**
 * Builds and configures the Express application instance.
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();

  // Helmet with relaxed CSP for Swagger UI docs and static frontend assets
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestLogger);

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

  // SPA fallback: Return index.html for non-API routes when frontend build exists
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/docs')) {
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

