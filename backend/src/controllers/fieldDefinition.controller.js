import * as fieldDefinitionService from '../services/fieldDefinition.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function listFieldDefinitions(req, res) {
  const { query } = req.validated;
  const items = await fieldDefinitionService.listFieldDefinitions({ filters: query, actor: req.user });
  return sendSuccess(res, items);
}

export async function createFieldDefinition(req, res) {
  const { body } = req.validated;
  const result = await fieldDefinitionService.createFieldDefinition({ input: body, actor: req.user });
  return sendSuccess(res, result, { status: 201 });
}

export async function updateFieldDefinition(req, res) {
  const { params, body } = req.validated;
  const result = await fieldDefinitionService.updateFieldDefinition({ id: params.id, input: body, actor: req.user });
  return sendSuccess(res, result);
}
