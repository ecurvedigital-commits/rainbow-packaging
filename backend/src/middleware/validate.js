import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

function hasDisallowedDollarKey(obj, allowCustomFieldPrefix = false) {
  if (!obj || typeof obj !== 'object') return false;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) {
      return true;
    }
    if (key.includes('.') && allowCustomFieldPrefix && !key.startsWith('cf.')) {
      return true;
    }
    if (typeof obj[key] === 'object' && hasDisallowedDollarKey(obj[key], false)) {
      return true;
    }
  }
  return false;
}

/**
 * Zod validation middleware for body, query, and params.
 * Stores parsed result in req.validated = { body, query, params }.
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
export function validate(schema) {
  return (req, _res, next) => {
    if (hasDisallowedDollarKey(req.body, false) ||
        hasDisallowedDollarKey(req.query, true) ||
        hasDisallowedDollarKey(req.params, false)) {
      return next(createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'Keys starting with $ are not allowed.'));
    }

    const toValidate = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    const parsed = schema.safeParse(toValidate);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => {
        const fieldPath = issue.path.slice(1).join('.');
        return {
          field: fieldPath || issue.path.join('.'),
          message: issue.message,
        };
      });
      return next(createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'One or more fields are invalid.', details));
    }

    req.validated = parsed.data || {};
    next();
  };
}
