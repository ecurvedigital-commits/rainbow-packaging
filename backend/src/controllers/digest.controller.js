import * as digestService from '../services/digest.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function previewDigest(req, res) {
  const { query } = req.validated;
  const result = await digestService.previewDigest({ query, actor: req.user });
  return sendSuccess(res, result);
}

export async function sendDigest(req, res) {
  const { body } = req.validated;
  const result = await digestService.sendDigest({ input: body, actor: req.user });
  return sendSuccess(res, result);
}

export async function listDigestLogs(req, res) {
  const { query } = req.validated;
  const { items, meta } = await digestService.listDigestLogs({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}
