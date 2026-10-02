import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePagination, buildPaginationMeta } from '../src/utils/pagination.js';
import { paginationQuerySchema, sortQuery } from '../src/validators/common.validator.js';
import { listReelsSchema } from '../src/validators/reel.validator.js';
import { buildReelFilter } from '../src/utils/buildReelFilter.js';

describe('Pagination Utilities and Contracts', () => {
  it('parses default pagination parameters correctly (page=1, limit=25, skip=0)', () => {
    const res = parsePagination({});
    assert.equal(res.page, 1);
    assert.equal(res.limit, 25);
    assert.equal(res.skip, 0);
  });

  it('parses custom page and limit parameters', () => {
    const res = parsePagination({ page: '3', limit: '15' });
    assert.equal(res.page, 3);
    assert.equal(res.limit, 15);
    assert.equal(res.skip, 30);
  });

  it('enforces maximum limit cap of 100', () => {
    const res = parsePagination({ page: '1', limit: '10000' });
    assert.equal(res.page, 1);
    assert.equal(res.limit, 100);
    assert.equal(res.skip, 0);
  });

  it('safely clamps negative page and falls back limit when 0 or invalid', () => {
    const res = parsePagination({ page: '-5', limit: '0' });
    assert.equal(res.page, 1);
    assert.equal(res.limit, 25);
    assert.equal(res.skip, 0);
  });

  it('builds comprehensive pagination metadata with camelCase and snake_case properties', () => {
    const meta = buildPaginationMeta({ page: 2, limit: 25, total: 100 });
    assert.equal(meta.page, 2);
    assert.equal(meta.limit, 25);
    assert.equal(meta.total, 100);
    assert.equal(meta.total_pages, 4);
    assert.equal(meta.totalPages, 4);
    assert.equal(meta.has_next_page, true);
    assert.equal(meta.hasNextPage, true);
    assert.equal(meta.has_previous_page, true);
    assert.equal(meta.hasPreviousPage, true);
  });

  it('handles last page metadata correctly', () => {
    const meta = buildPaginationMeta({ page: 4, limit: 25, total: 100 });
    assert.equal(meta.has_next_page, false);
    assert.equal(meta.hasNextPage, false);
    assert.equal(meta.has_previous_page, true);
    assert.equal(meta.hasPreviousPage, true);
  });

  it('handles page beyond total pages metadata correctly', () => {
    const meta = buildPaginationMeta({ page: 99, limit: 25, total: 100 });
    assert.equal(meta.has_next_page, false);
    assert.equal(meta.hasNextPage, false);
    assert.equal(meta.has_previous_page, true);
  });

  it('handles empty collection metadata correctly', () => {
    const meta = buildPaginationMeta({ page: 1, limit: 25, total: 0 });
    assert.equal(meta.total_pages, 0);
    assert.equal(meta.totalPages, 0);
    assert.equal(meta.has_next_page, false);
    assert.equal(meta.has_previous_page, false);
  });
});

describe('Pagination Zod Validation Schemas', () => {
  it('validates default query parameters using paginationQuerySchema', () => {
    const result = paginationQuerySchema.safeParse({});
    assert.equal(result.success, true);
    assert.equal(result.data.page, 1);
    assert.equal(result.data.limit, 25);
  });

  it('rejects limit greater than 100', () => {
    const result = paginationQuerySchema.safeParse({ limit: 500 });
    assert.equal(result.success, false);
  });

  it('rejects page less than 1', () => {
    const result = paginationQuerySchema.safeParse({ page: 0 });
    assert.equal(result.success, false);
  });

  it('rejects negative limit', () => {
    const result = paginationQuerySchema.safeParse({ limit: -10 });
    assert.equal(result.success, false);
  });

  it('rejects non-numeric string values for page or limit', () => {
    const result = paginationQuerySchema.safeParse({ page: 'abc', limit: 'xyz' });
    assert.equal(result.success, false);
  });

  it('validates allowed sort fields using sortQuery', () => {
    const validator = sortQuery(['purchase_date', 'quality', 'created_at']);
    assert.equal(validator.safeParse('purchase_date').success, true);
    assert.equal(validator.safeParse('-quality').success, true);
    assert.equal(validator.safeParse('cf.thickness_micron').success, true);
    assert.equal(validator.safeParse('unsupported_field').success, false);
  });
});

describe('Filter Building and Authorization Integration', () => {
  it('builds reel filter with active record status by default for operators', () => {
    const filter = buildReelFilter({ status: 'REEL', quality: 'VK' }, { role: 'OPERATOR' });
    assert.equal(filter.record_status, 'ACTIVE');
    assert.equal(filter.status, 'REEL');
    assert.equal(filter.quality, 'VK');
  });

  it('includes voided reels only when requested by an Admin', () => {
    const adminFilter = buildReelFilter({ include_voided: 'true' }, { role: 'ADMIN' });
    assert.equal(adminFilter.record_status, undefined);

    const operatorFilter = buildReelFilter({ include_voided: 'true' }, { role: 'OPERATOR' });
    assert.equal(operatorFilter.record_status, 'ACTIVE');
  });
});
