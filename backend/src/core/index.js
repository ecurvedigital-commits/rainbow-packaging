// Configuration
export { env } from './config/env.js';
export { corsOptions } from './config/cors.js';
export { logger } from './config/logger.js';
export { sendMail } from './config/mailer.js';
export { swaggerDocument } from './config/swagger.js';

// Database
export { connectDB, disconnectDB, withTransaction } from './database/db.js';
export { Counter } from './database/counter.model.js';
export { getNextSequence, getNextCustomFieldSequence, resetCounter } from './database/counter.service.js';

// Constants
export { ROLES } from './constants/roles.js';
export { ERROR_CODES } from './constants/errorCodes.js';
export { APPROVAL_STATUS } from './constants/approvalStatus.js';
export { DIGEST_STATUS } from './constants/digestStatus.js';
export { EVENT_TYPES } from './constants/eventTypes.js';
export { FIELD_TYPES } from './constants/fieldTypes.js';
export { NOTIFICATION_TYPES } from './constants/notificationTypes.js';

// Errors & Utils
export { createApiError, isApiError } from './errors/ApiError.js';
export { sendSuccess, sendError } from './utils/apiResponse.js';
export { parsePagination, buildPaginationMeta } from './utils/pagination.js';
export { hashPassword, comparePassword, generateTempPassword } from './utils/password.js';

// Middleware
export { authenticate } from './middleware/authenticate.js';
export { authorizeRoles } from './middleware/authorizeRoles.js';
export { errorHandler } from './middleware/errorHandler.js';
export { notFound } from './middleware/notFound.js';
export { apiRateLimiter, authRateLimiter } from './middleware/rateLimiter.js';
export { requestLogger } from './middleware/requestLogger.js';
export { requirePasswordChange } from './middleware/requirePasswordChange.js';
export { validate } from './middleware/validate.js';

// Common Validators
export {
  idParamSchema,
  paginationQuerySchema,
  sortQuery,
  booleanString,
  dateOnlySchema,
} from './validators/common.validator.js';

// Platform Services
export { appendEvent, listEventsForEntity } from './services/eventLog.service.js';
export { startKeepAliveJob } from './services/keepAlive.service.js';

