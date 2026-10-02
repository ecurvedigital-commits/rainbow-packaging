import * as approvalService from '../services/approval.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function listPendingApprovals(req, res) {
  const { query } = req.validated;
  const { items, meta } = await approvalService.listPendingApprovals({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}

export async function listMyEntries(req, res) {
  const { query } = req.validated;
  const { items, meta } = await approvalService.listMyEntries({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}

export async function confirmEntry(req, res) {
  const { params } = req.validated;
  const result = await approvalService.confirmEntry({ eventId: params.eventId, actor: req.user });
  return sendSuccess(res, result);
}

export async function declineEntry(req, res) {
  const { params, body } = req.validated;
  const result = await approvalService.declineEntry({ eventId: params.eventId, input: body, actor: req.user });
  return sendSuccess(res, result);
}
