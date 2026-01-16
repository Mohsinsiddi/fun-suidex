// ============================================
// Rate Limiter (In-Memory)
// ============================================
// Simple rate limiter for Next.js API routes
// Uses in-memory storage - resets on server restart
// For production at scale, consider Redis

import { NextRequest } from 'next/server'
import { getClientIP } from './api'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 60 seconds
const CLEANUP_INTERVAL = 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  })
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  auth: { windowMs: 60 * 1000, maxRequests: 10 },         // 10 per minute
  adminLogin: { windowMs: 60 * 1000, maxRequests: 5 },    // 5 per minute

  // User actions
  spin: { windowMs: 60 * 1000, maxRequests: 30 },         // 30 per minute
  payment: { windowMs: 60 * 1000, maxRequests: 10 },      // 10 per minute

  // Read endpoints - more lenient
  read: { windowMs: 60 * 1000, maxRequests: 60 },         // 60 per minute

  // Admin endpoints
  admin: { windowMs: 60 * 1000, maxRequests: 100 },       // 100 per minute
  adminWrite: { windowMs: 60 * 1000, maxRequests: 30 },   // 30 per minute

  // Default
  default: { windowMs: 60 * 1000, maxRequests: 60 },      // 60 per minute
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

/**
 * Check rate limit for a request
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'default',
  identifier?: string
): { allowed: boolean; remaining: number; resetIn: number } {
  cleanup()

  const config = RATE_LIMITS[type]
  const ip = getClientIP(request)
  const key = identifier ? `${type}:${identifier}` : `${type}:${ip}`
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  // No existing entry or entry has expired
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    }
  }

  // Entry exists and hasn't expired
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    }
  }

  // Increment count
  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  }
}

/**
 * Rate limit middleware helper
 * Use in API routes: if (!rateLimit(request, 'auth')) return rateLimitResponse()
 */
export function rateLimit(
  request: NextRequest,
  type: RateLimitType = 'default',
  identifier?: string
): boolean {
  const result = checkRateLimit(request, type, identifier)
  return result.allowed
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  request: NextRequest,
  type: RateLimitType = 'default',
  identifier?: string
): Record<string, string> {
  const result = checkRateLimit(request, type, identifier)
  const config = RATE_LIMITS[type]

  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000)),
  }
}

/**
 * Combined Wallet + IP rate limiting
 * Checks both IP and wallet separately - both must pass
 * Use for critical user actions like spinning
 */
export function checkWalletAndIPRateLimit(
  request: NextRequest,
  wallet: string,
  type: RateLimitType = 'default'
): { allowed: boolean; remaining: number; resetIn: number; blockedBy: 'ip' | 'wallet' | null } {
  const ip = getClientIP(request)

  // Check IP-based limit
  const ipResult = checkRateLimit(request, type, `ip:${ip}`)
  if (!ipResult.allowed) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: ipResult.resetIn,
      blockedBy: 'ip',
    }
  }

  // Check wallet-based limit
  const walletResult = checkRateLimit(request, type, `wallet:${wallet.toLowerCase()}`)
  if (!walletResult.allowed) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: walletResult.resetIn,
      blockedBy: 'wallet',
    }
  }

  // Both passed - return the lower remaining count
  return {
    allowed: true,
    remaining: Math.min(ipResult.remaining, walletResult.remaining),
    resetIn: Math.min(ipResult.resetIn, walletResult.resetIn),
    blockedBy: null,
  }
}

/**
 * Simple wallet + IP rate limit check
 * Returns true if allowed, false if blocked
 */
export function rateLimitWalletAndIP(
  request: NextRequest,
  wallet: string,
  type: RateLimitType = 'default'
): boolean {
  const result = checkWalletAndIPRateLimit(request, wallet, type)
  return result.allowed
}
