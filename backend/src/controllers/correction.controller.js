import * as correctionService from '../services/correction.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function createCorrectionRequest(req, res) {
  const { body } = req.validated;
  const result = await correctionService.createCorrectionRequest({ input: body, actor: req.user });
  return sendSuccess(res, result, { status: 201 });
}

export async function listCorrectionRequests(req, res) {
  const { query } = req.validated;
  const { items, meta } = await correctionService.listCorrectionRequests({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}

export async function getPendingCorrectionCount(req, res) {
  const result = await correctionService.getPendingCorrectionCount();
  return sendSuccess(res, result);
}

export async function getCorrectionRequest(req, res) {
  const { params } = req.validated;
  const result = await correctionService.getCorrectionRequest({ id: params.id, actor: req.user });
  return sendSuccess(res, result);
}

export async function resolveCorrectionRequest(req, res) {
  const { params, body } = req.validated;
  const result = await correctionService.resolveCorrectionRequest({
    id: params.id,
    input: body,
    actor: req.user,
  });
  return sendSuccess(res, result);
}

export async function rejectCorrectionRequest(req, res) {
  const { params, body } = req.validated;
  const result = await correctionService.rejectCorrectionRequest({
    id: params.id,
    input: body,
    actor: req.user,
  });
  return sendSuccess(res, result);
}
