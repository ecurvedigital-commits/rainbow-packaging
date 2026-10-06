import * as messageService from '../services/message.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function sendMessage(req, res) {
  const { body } = req.validated;
  const result = await messageService.sendMessage({ input: body, actor: req.user });
  return sendSuccess(res, result, { status: 201 });
}

export async function listMessages(req, res) {
  const { query } = req.validated;
  const { items, meta } = await messageService.listMessages({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}

export async function getMessage(req, res) {
  const { params } = req.validated;
  const result = await messageService.getMessage({ id: params.id, actor: req.user });
  return sendSuccess(res, result);
}
