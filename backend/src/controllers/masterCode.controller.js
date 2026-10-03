import * as masterCodeService from '../services/masterCode.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function getMasterCodes(req, res, next) {
  try {
    const { status, q } = req.query;
    const items = await masterCodeService.listMasterCodes({ status, q });
    return sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

export async function createMasterCode(req, res, next) {
  try {
    const result = await masterCodeService.createMasterCode({
      data: req.body,
      actor: req.user,
    });
    return sendSuccess(res, result, { status: 201 });
  } catch (err) {
    next(err);
  }
}

export async function updateMasterCode(req, res, next) {
  try {
    const result = await masterCodeService.updateMasterCode({
      id: req.params.id,
      data: req.body,
      actor: req.user,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function deleteMasterCode(req, res, next) {
  try {
    const result = await masterCodeService.deleteMasterCode({
      id: req.params.id,
      actor: req.user,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
