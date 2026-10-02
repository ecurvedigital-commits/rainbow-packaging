import * as dashboardService from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function getSummary(req, res) {
  const result = await dashboardService.getSummary({ actor: req.user });
  return sendSuccess(res, result);
}

export async function getStatusBoard(req, res) {
  const { query } = req.validated;
  const result = await dashboardService.getStatusBoard({ filters: query, actor: req.user });
  return sendSuccess(res, result);
}

export async function getBreakdown(req, res) {
  const { query } = req.validated;
  const result = await dashboardService.getBreakdown({ filters: query, actor: req.user });
  return sendSuccess(res, result);
}

export async function getAging(req, res) {
  const { query } = req.validated;
  const { items, meta } = await dashboardService.getAging({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}
