import * as auditService from '../services/audit.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function listAuditEvents(req, res) {
  const { query } = req.validated;
  const { items, meta } = await auditService.listAuditEvents({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}

export async function getAuditEventById(req, res) {
  const { id } = req.validated.params;
  const result = await auditService.getAuditEventById({ id, actor: req.user });
  return sendSuccess(res, result);
}
