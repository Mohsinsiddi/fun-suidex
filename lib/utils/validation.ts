// ============================================
// Request Validation Utilities
// ============================================

import { NextRequest } from 'next/server'

/**
 * Validate SUI wallet address format
 */
export function isValidSuiAddress(address: string): boolean {
  if (!address) return false
  // SUI addresses are 66 characters (0x + 64 hex chars)
  return /^0x[a-fA-F0-9]{64}$/.test(address)
}

/**
 * Extract and validate transaction hash
 * Supports:
 * - Full URLs: https://suiscan.xyz/mainnet/tx/DIGEST or https://suivision.xyz/txblock/DIGEST
 * - SUI digest: base58 encoded, 43-44 chars (e.g., 9BjcwwDv6Z6sfodJMYqwBExB8ziUzBwU2ba6fPCGPCwe)
 * - Hex format: 64+ hex chars with optional 0x prefix
 */
export function isValidTxHash(input: string): boolean {
  if (!input) return false

  // Extract digest from explorer URLs
  let hash = input.trim()

  // Handle suiscan URLs: https://suiscan.xyz/mainnet/tx/DIGEST
  const suiscanMatch = hash.match(/suiscan\.xyz\/\w+\/tx\/([A-Za-z0-9]+)/)
  if (suiscanMatch) {
    hash = suiscanMatch[1]
  }

  // Handle suivision URLs: https://suivision.xyz/txblock/DIGEST
  const suivisionMatch = hash.match(/suivision\.xyz\/txblock\/([A-Za-z0-9]+)/)
  if (suivisionMatch) {
    hash = suivisionMatch[1]
  }

  if (hash.length < 32) return false

  // SUI base58 digest format (43-44 chars, alphanumeric)
  if (/^[A-HJ-NP-Za-km-z1-9]{43,44}$/.test(hash)) {
    return true
  }

  // Hex format (64+ chars, optional 0x prefix)
  const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash
  return /^[a-fA-F0-9]{64,}$/.test(cleanHash)
}

/**
 * Extract transaction hash from input (URL or raw hash)
 */
export function extractTxHash(input: string): string {
  if (!input) return ''

  let hash = input.trim()

  // Handle suiscan URLs
  const suiscanMatch = hash.match(/suiscan\.xyz\/\w+\/tx\/([A-Za-z0-9]+)/)
  if (suiscanMatch) return suiscanMatch[1]

  // Handle suivision URLs
  const suivisionMatch = hash.match(/suivision\.xyz\/txblock\/([A-Za-z0-9]+)/)
  if (suivisionMatch) return suivisionMatch[1]

  return hash
}

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  if (!id) return false
  return /^[a-fA-F0-9]{24}$/.test(id)
}

/**
 * Validate positive integer
 */
export function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/**
 * Validate non-negative number
 */
export function isNonNegative(value: unknown): value is number {
  return typeof value === 'number' && value >= 0
}

/**
 * Validate string is non-empty
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Validate enum value
 */
export function isValidEnum<T extends string>(value: unknown, validValues: readonly T[]): value is T {
  return typeof value === 'string' && validValues.includes(value as T)
}

/**
 * Parse and validate JSON body from request
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: NextRequest
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    return { success: true, data: body as T }
  } catch {
    return { success: false, error: 'Invalid JSON body' }
  }
}

/**
 * Get query param as string
 */
export function getQueryParam(request: NextRequest, key: string): string | null {
  const url = new URL(request.url)
  return url.searchParams.get(key)
}

/**
 * Get query param as number
 */
export function getQueryParamInt(
  request: NextRequest,
  key: string,
  defaultValue?: number
): number | null {
  const value = getQueryParam(request, key)
  if (value === null) return defaultValue ?? null

  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? (defaultValue ?? null) : parsed
}

/**
 * Get query param as boolean
 */
export function getQueryParamBool(
  request: NextRequest,
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = getQueryParam(request, key)
  if (value === null) return defaultValue
  return value === 'true' || value === '1'
}

/**
 * Sanitize string for safe storage
 */
export function sanitizeString(value: string, maxLength: number = 1000): string {
  return value.trim().slice(0, maxLength)
}

/**
 * Normalize wallet address to lowercase
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase().trim()
}

/**
 * Escape special regex characters for safe use in MongoDB $regex queries
 * Prevents NoSQL injection via regex patterns
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Create a safe regex pattern for MongoDB queries
 * @param pattern - User input to search for
 * @param anchor - Optional anchor: 'start' for ^, 'end' for $, 'both' for ^...$
 */
export function safeRegexPattern(pattern: string, anchor?: 'start' | 'end' | 'both'): string {
  const escaped = escapeRegex(pattern)
  switch (anchor) {
    case 'start':
      return `^${escaped}`
    case 'end':
      return `${escaped}$`
    case 'both':
      return `^${escaped}$`
    default:
      return escaped
  }
}
