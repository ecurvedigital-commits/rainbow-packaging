import * as reelService from '../services/reel.service.js';
import * as usageService from '../services/usage.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function listReels(req, res) {
  const { query } = req.validated;
  const { items, meta } = await reelService.listReels({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}

export async function searchReels(req, res) {
  const { query } = req.validated;
  const items = await reelService.searchReels({ query, actor: req.user });
  return sendSuccess(res, items);
}

export async function getReel(req, res) {
  const { params } = req.validated;
  const result = await reelService.getReel({ id: params.id, actor: req.user });
  return sendSuccess(res, result);
}

export async function getReelJourney(req, res) {
  const { params, query } = req.validated;
  const result = await reelService.getReelJourney({ id: params.id, query, actor: req.user });
  const meta = result.meta;
  const payload = { reel: result.reel, events: result.events };
  return sendSuccess(res, payload, meta ? { meta } : {});
}

export async function createReel(req, res) {
  const { body } = req.validated;
  const result = await reelService.createReel({ input: body, actor: req.user });
  return sendSuccess(res, result, { status: 201 });
}

export async function bulkCreateReels(req, res) {
  const { body } = req.validated;
  const result = await reelService.bulkCreateReels({ input: body, actor: req.user });
  return sendSuccess(res, result, { status: 201 });
}

export async function recordUsage(req, res) {
  const { params, body } = req.validated;
  const result = await usageService.recordUsage({ id: params.id, input: body, actor: req.user });
  return sendSuccess(res, result, { status: 201 });
}

export async function updateReel(req, res) {
  const { params, body } = req.validated;
  const result = await reelService.updateReel({ id: params.id, input: body, actor: req.user });
  return sendSuccess(res, result);
}

export async function voidReel(req, res) {
  const { params, body } = req.validated;
  const result = await reelService.voidReel({ id: params.id, input: body, actor: req.user });
  return sendSuccess(res, result);
}

export async function getNextReelNumber(req, res) {
  const result = await reelService.getNextReelNumber();
  return sendSuccess(res, result);
}

export async function getFilterOptions(req, res) {
  const result = await reelService.getFilterOptions();
  return sendSuccess(res, result);
}

export async function listUsageLogs(req, res) {
  const { query } = req.validated || { query: req.query };
  const { items, meta } = await usageService.listUsageLogs({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}
