import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';
import { corsOptions } from './config/cors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { apiRouter } from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * Builds and configures the Express application instance.
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();

  // Helmet with relaxed CSP for Swagger UI docs
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

  // 404 and Global Error Handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
