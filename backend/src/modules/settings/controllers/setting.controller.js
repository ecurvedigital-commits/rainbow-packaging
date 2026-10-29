import * as settingService from '../services/setting.service.js';
import { sendSuccess } from '../../../core/utils/apiResponse.js';

export async function getSettings(req, res) {
  const result = await settingService.getSettings({ actor: req.user });
  return sendSuccess(res, result);
}

export async function updateSettings(req, res) {
  const { body } = req.validated;
  const result = await settingService.updateSettings({ input: body, actor: req.user });
  return sendSuccess(res, result);
}
