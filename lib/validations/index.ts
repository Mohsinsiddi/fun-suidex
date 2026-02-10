// ============================================
// Zod Validation Schemas
// ============================================

import { z } from 'zod'
import { NextResponse } from 'next/server'

// ----------------------------------------
// Common Schemas
// ----------------------------------------

export const walletSchema = z
  .string()
  .min(1, 'Wallet address is required')
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid Sui wallet address')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format')

// ----------------------------------------
// Auth Schemas
// ----------------------------------------

export const authNonceSchema = z.object({
  wallet: walletSchema,
})

export const authVerifySchema = z.object({
  wallet: walletSchema,
  signature: z.string().min(1, 'Signature is required'),
  nonce: z.string().min(1, 'Nonce is required'),
  referrer: z.string().optional(),
})

// ----------------------------------------
// Profile Schemas
// ----------------------------------------

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .max(50, 'Display name must be 50 characters or less')
    .optional()
    .transform((v) => v?.trim() || undefined),
  bio: z
    .string()
    .max(160, 'Bio must be 160 characters or less')
    .optional()
    .transform((v) => v?.trim() || undefined),
  isPublic: z.boolean().optional(),
  featuredBadges: z.array(z.string()).max(5).optional(),
})

// ----------------------------------------
// Referral Schemas
// ----------------------------------------

export const referralApplySchema = z.object({
  referrerWallet: walletSchema,
})

// ----------------------------------------
// Payment Schemas
// ----------------------------------------

// Extract raw digest from SuiScan/SuiVision URLs or plain hash
function extractTxDigest(input: string): string {
  const trimmed = input.trim()

  // suiscan.xyz/mainnet/tx/<digest> or suiscan.xyz/testnet/tx/<digest>
  const suiscanMatch = trimmed.match(/suiscan\.xyz\/[^/]+\/tx\/([A-Za-z0-9]+)/)
  if (suiscanMatch) return suiscanMatch[1]

  // suivision.xyz/txblock/<digest>
  const suivisionMatch = trimmed.match(/suivision\.xyz\/txblock\/([A-Za-z0-9]+)/)
  if (suivisionMatch) return suivisionMatch[1]

  return trimmed
}

// SUI tx digests are Base58-encoded 32-byte hashes (typically 43-44 chars)
// Base58 charset: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
const SUI_TX_DIGEST_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/

export const paymentClaimSchema = z.object({
  txHash: z
    .string()
    .trim()
    .transform(extractTxDigest)
    .pipe(
      z
        .string()
        .min(43, 'Transaction hash is too short')
        .max(44, 'Transaction hash is too long')
        .regex(SUI_TX_DIGEST_REGEX, 'Invalid transaction hash format (expected Base58)')
    ),
})

// ----------------------------------------
// Admin Schemas
// ----------------------------------------

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const adminCreditSpinsSchema = z.object({
  wallet: walletSchema,
  spins: z.number().int().min(1).max(10000, 'Maximum 10000 spins'),
  reason: z.string().min(1, 'Reason is required').max(500),
})

export const adminAwardBadgeSchema = z.object({
  wallet: walletSchema,
  badgeId: z.string().min(1, 'Badge ID is required'),
  reason: z.string().max(500).optional(),
})

export const adminConfigUpdateSchema = z.object({
  // General
  maintenanceMode: z.boolean().optional(),

  // Spin settings
  spinCostSUI: z.number().min(0).optional(),
  victoryPriceUSD: z.number().min(0).optional(),

  // Referral settings
  referralEnabled: z.boolean().optional(),
  referralCommissionPercent: z.number().min(0).max(100).optional(),

  // Badge settings
  badgesEnabled: z.boolean().optional(),
  earlyBirdCutoffDate: z.string().datetime().nullable().optional(),

  // Profile settings
  profileSharingEnabled: z.boolean().optional(),
  profileShareMinSpins: z.number().int().min(0).optional(),
})

// ----------------------------------------
// Validation Helper
// ----------------------------------------

/**
 * Validate request body with Zod schema
 * Returns parsed data or null (with error response sent)
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))

      return {
        data: null,
        error: NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: errors,
          },
          { status: 400 }
        ),
      }
    }

    return { data: result.data, error: null }
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validate query params with Zod schema
 */
export function validateQuery<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { data: z.infer<T>; error: null } | { data: null; error: NextResponse } {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const errors = result.error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))

    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: errors,
        },
        { status: 400 }
      ),
    }
  }

  return { data: result.data, error: null }
}
