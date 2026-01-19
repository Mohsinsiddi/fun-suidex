// ============================================
// Pagination Utilities
// ============================================

import { NextRequest } from 'next/server'

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationMeta
}

// Pagination constraints
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MIN_LIMIT = 1

/**
 * Parse pagination params from request URL
 */
export function parsePaginationParams(request: NextRequest): PaginationParams {
  const url = new URL(request.url)

  let page = parseInt(url.searchParams.get('page') || String(DEFAULT_PAGE), 10)
  let limit = parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT), 10)

  // Validate and constrain
  if (isNaN(page) || page < 1) page = DEFAULT_PAGE
  if (isNaN(limit) || limit < MIN_LIMIT) limit = DEFAULT_LIMIT
  if (limit > MAX_LIMIT) limit = MAX_LIMIT

  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    items,
    pagination: createPaginationMeta(page, limit, total),
  }
}

/**
 * Parse sort params from request URL
 */
export function parseSortParams(
  request: NextRequest,
  allowedFields: string[],
  defaultField: string = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): { sortField: string; sortOrder: 1 | -1 } {
  const url = new URL(request.url)

  let sortField = url.searchParams.get('sortBy') || defaultField
  const sortOrderParam = url.searchParams.get('sortOrder') || defaultOrder

  // Validate sort field
  if (!allowedFields.includes(sortField)) {
    sortField = defaultField
  }

  const sortOrder = sortOrderParam === 'asc' ? 1 : -1

  return { sortField, sortOrder }
}
