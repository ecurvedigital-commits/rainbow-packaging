/**
 * Parses page and limit from query parameters.
 * @param {object} query
 * @param {number} [defaultLimit=25]
 * @param {number} [maxLimit=100]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function parsePagination(query = {}, defaultLimit = 25, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Builds pagination metadata for list responses.
 * @param {{ page: number, limit: number, total: number, [key: string]: any }} params
 * @returns {{ page: number, limit: number, total: number, total_pages: number, totalPages: number, has_next_page: boolean, hasNextPage: boolean, has_previous_page: boolean, hasPreviousPage: boolean }}
 */
export function buildPaginationMeta({ page, limit, total, ...extra }) {
  const total_pages = limit > 0 ? Math.ceil(total / limit) : (total > 0 ? 1 : 0);
  const has_next_page = page < total_pages;
  const has_previous_page = page > 1 && total_pages > 0;

  return {
    page,
    limit,
    total,
    total_pages,
    totalPages: total_pages,
    has_next_page,
    hasNextPage: has_next_page,
    has_previous_page,
    hasPreviousPage: has_previous_page,
    ...extra,
  };
}

