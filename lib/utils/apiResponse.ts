// ============================================
// Standardized API Response Helpers
// ============================================

import { NextResponse } from 'next/server'

// ----------------------------------------
// Error Codes
// ----------------------------------------

export const ErrorCodes = {
  // Auth errors (1xxx)
  UNAUTHORIZED: 'ERR_1001',
  SESSION_EXPIRED: 'ERR_1002',
  INVALID_SIGNATURE: 'ERR_1003',
  INVALID_CREDENTIALS: 'ERR_1004',

  // Validation errors (2xxx)
  VALIDATION_FAILED: 'ERR_2001',
  INVALID_INPUT: 'ERR_2002',
  MISSING_REQUIRED_FIELD: 'ERR_2003',

  // Resource errors (3xxx)
  NOT_FOUND: 'ERR_3001',
  ALREADY_EXISTS: 'ERR_3002',
  RESOURCE_LOCKED: 'ERR_3003',

  // Business logic errors (4xxx)
  NO_SPINS_AVAILABLE: 'ERR_4001',
  INSUFFICIENT_BALANCE: 'ERR_4002',
  NOT_ELIGIBLE: 'ERR_4003',
  ALREADY_CLAIMED: 'ERR_4004',
  RATE_LIMITED: 'ERR_4005',
  FEATURE_DISABLED: 'ERR_4006',

  // Server errors (5xxx)
  INTERNAL_ERROR: 'ERR_5001',
  DATABASE_ERROR: 'ERR_5002',
  EXTERNAL_SERVICE_ERROR: 'ERR_5003',
  SYSTEM_NOT_CONFIGURED: 'ERR_5004',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ----------------------------------------
// Response Types
// ----------------------------------------

interface SuccessResponse<T> {
  success: true
  data: T
}

interface ErrorResponse {
  success: false
  error: string
  code?: ErrorCode
  details?: unknown
}

interface PaginatedData<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ----------------------------------------
// Success Responses
// ----------------------------------------

export function success<T>(data: T, status = 200): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function created<T>(data: T): NextResponse<SuccessResponse<T>> {
  return success(data, 201)
}

export function paginated<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<SuccessResponse<PaginatedData<T>>> {
  const totalPages = Math.ceil(total / limit)
  return success({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  })
}

// ----------------------------------------
// Error Responses
// ----------------------------------------

export function error(
  message: string,
  status = 500,
  code?: ErrorCode,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = { success: false, error: message }
  if (code) response.code = code
  if (details) response.details = details
  return NextResponse.json(response, { status })
}

// Pre-built common errors
export const errors = {
  unauthorized: (message = 'Unauthorized') =>
    error(message, 401, ErrorCodes.UNAUTHORIZED),

  sessionExpired: () =>
    error('Session expired. Please sign in again.', 401, ErrorCodes.SESSION_EXPIRED),

  forbidden: (message = 'Access denied') =>
    error(message, 403, ErrorCodes.UNAUTHORIZED),

  notFound: (resource = 'Resource') =>
    error(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),

  badRequest: (message: string, details?: unknown) =>
    error(message, 400, ErrorCodes.INVALID_INPUT, details),

  validationFailed: (details: unknown) =>
    error('Validation failed', 400, ErrorCodes.VALIDATION_FAILED, details),

  conflict: (message: string) =>
    error(message, 409, ErrorCodes.ALREADY_EXISTS),

  rateLimited: (retryAfter: number) =>
    NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: ErrorCodes.RATE_LIMITED,
        retryAfter,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    ),

  noSpins: () =>
    error('No spins available. Purchase more to continue playing.', 400, ErrorCodes.NO_SPINS_AVAILABLE),

  notEligible: (message: string) =>
    error(message, 403, ErrorCodes.NOT_ELIGIBLE),

  featureDisabled: (feature: string) =>
    error(`${feature} is currently disabled`, 403, ErrorCodes.FEATURE_DISABLED),

  internal: (message = 'An unexpected error occurred. Please try again.') =>
    error(message, 500, ErrorCodes.INTERNAL_ERROR),

  notConfigured: () =>
    error('System is not properly configured', 500, ErrorCodes.SYSTEM_NOT_CONFIGURED),
}
