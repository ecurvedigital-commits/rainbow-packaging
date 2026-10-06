import * as userService from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function createUser(req, res) {
  const { body } = req.validated;
  const result = await userService.createUser({ input: body, actor: req.user });
  return sendSuccess(res, result, { status: 201 });
}

export async function listUsers(req, res) {
  const { query } = req.validated;
  const { items, meta } = await userService.listUsers({ filters: query, actor: req.user });
  return sendSuccess(res, items, { meta });
}

export async function listDirectory(req, res) {
  const items = await userService.listDirectory({ actor: req.user });
  return sendSuccess(res, items);
}

export async function getUser(req, res) {
  const { params } = req.validated;
  const result = await userService.getUser({ id: params.id, actor: req.user });
  return sendSuccess(res, result);
}

export async function updateUser(req, res) {
  const { params, body } = req.validated;
  const result = await userService.updateUser({ id: params.id, input: body, actor: req.user });
  return sendSuccess(res, result);
}

export async function setUserStatus(req, res) {
  const { params, body } = req.validated;
  const result = await userService.setUserStatus({ id: params.id, input: body, actor: req.user });
  return sendSuccess(res, result);
}

export async function resetUserPassword(req, res) {
  const { params, body } = req.validated;
  const result = await userService.resetUserPassword({ id: params.id, input: body, actor: req.user });
  return sendSuccess(res, result);
}

export async function unlockUser(req, res) {
  const { params } = req.validated;
  const result = await userService.unlockUser({ id: params.id, actor: req.user });
  return sendSuccess(res, result);
}

export async function deleteUser(req, res) {
  const { params } = req.validated;
  const result = await userService.deleteUser({ id: params.id, actor: req.user });
  return sendSuccess(res, result);
}

