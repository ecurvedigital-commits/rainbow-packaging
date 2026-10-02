import { FieldDefinition } from '../models/fieldDefinition.model.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const RESERVED_REEL_KEYS = new Set([
  'sr_no',
  'reel_no',
  'quality',
  'bf',
  'purchase_date',
  'supplier_name',
  'size',
  'gsm',
  'max_weight',
  'previous_weight',
  'status',
  'stations_used',
  'pending_count',
  'record_status',
  'last_activity_at',
  'created_by',
  'created_at',
  'updated_at',
]);

/**
 * List custom field definitions (docs/routes/field-definitions.md).
 * @param {{ filters: { active?: 'true' | 'false' | 'all' }, actor: object }} args
 * @returns {Promise<Array<object>>}
 */
export async function listFieldDefinitions({ filters = {}, actor }) {
  const query = {};

  if (filters.active === 'true' || !filters.active) {
    query.is_active = true;
  } else if (filters.active === 'false') {
    query.is_active = false;
  } else if (filters.active === 'all' && actor.role !== 'ADMIN') {
    query.is_active = true;
  }

  const defs = await FieldDefinition.find(query).sort({ order: 1, created_at: 1 });
  return defs.map((d) => d.toJSON());
}

/**
 * Create custom field definition (docs/routes/field-definitions.md).
 * @param {{ input: { label: string, type: 'text' | 'number', key?: string, required?: boolean, options?: Array<string> }, actor: object }} args
 * @returns {Promise<object>}
 */
export async function createFieldDefinition({ input, actor }) {
  const label = input.label.trim();
  let key = input.key ? input.key.trim().toLowerCase() : null;

  if (!key) {
    key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  if (RESERVED_REEL_KEYS.has(key)) {
    throw createApiError(409, ERROR_CODES.DUPLICATE_FIELD_KEY, `The key '${key}' clashes with a built-in reel parameter.`);
  }

  const existing = await FieldDefinition.findOne({ key });
  if (existing) {
    throw createApiError(409, ERROR_CODES.DUPLICATE_FIELD_KEY, `A field definition with key '${key}' already exists.`);
  }

  // Get next available order index
  const lastDef = await FieldDefinition.findOne().sort({ order: -1 }).lean();
  const nextOrder = (lastDef?.order || 0) + 1;

  const def = await FieldDefinition.create({
    key,
    label,
    type: input.type,
    required: Boolean(input.required),
    options: input.options || [],
    order: nextOrder,
    is_active: true,
    created_by: actor.id,
  });

  return def.toJSON();
}

/**
 * Update custom field definition (docs/routes/field-definitions.md).
 * @param {{ id: string, input: { label?: string, required?: boolean, order?: number, is_active?: boolean, options?: Array<string> }, actor: object }} args
 * @returns {Promise<object>}
 */
export async function updateFieldDefinition({ id, input, actor }) {
  const def = await FieldDefinition.findById(id);
  if (!def) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Field definition not found.');
  }

  if (input.label !== undefined) def.label = input.label.trim();
  if (input.required !== undefined) def.required = Boolean(input.required);
  if (input.order !== undefined) def.order = Number(input.order);
  if (input.is_active !== undefined) def.is_active = Boolean(input.is_active);
  if (input.options !== undefined) def.options = input.options;

  await def.save();
  return def.toJSON();
}
