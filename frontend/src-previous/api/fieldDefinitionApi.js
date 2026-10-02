import { apiFetch } from './client';

export const fieldDefinitionApi = {
  list: async () => {
    return apiFetch('/field-definitions', { method: 'GET' });
  },

  getFieldDefinitions: async () => {
    return fieldDefinitionApi.list();
  },

  create: async (data) => {
    return apiFetch('/field-definitions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createFieldDefinition: async (data) => {
    return fieldDefinitionApi.create(data);
  },

  update: async (id, data) => {
    return apiFetch(`/field-definitions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateFieldDefinition: async (id, data) => {
    return fieldDefinitionApi.update(id, data);
  },

  deleteFieldDefinition: async (id) => {
    return apiFetch(`/field-definitions/${id}`, {
      method: 'DELETE',
    });
  },
};
