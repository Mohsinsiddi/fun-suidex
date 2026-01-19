// ============================================
// Next.js Middleware
// ============================================
// Handles rate limiting and route protection

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory rate limit store (per edge runtime instance)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Rate limit configurations by path pattern
const RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  // Auth - strict limits to prevent brute force
  '/api/auth/nonce': { windowMs: 60000, maxRequests: 10 },
  '/api/auth/verify': { windowMs: 60000, maxRequests: 10 },
  '/api/admin/auth/login': { windowMs: 60000, maxRequests: 5 },

  // User actions
  '/api/spin': { windowMs: 60000, maxRequests: 30 },
  '/api/payment': { windowMs: 60000, maxRequests: 10 },

  // Default for other API routes
  '/api': { windowMs: 60000, maxRequests: 60 },
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || request.ip || 'unknown'
}

function getRateLimitConfig(pathname: string) {
  // Check for specific path matches first
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (path !== '/api' && pathname.startsWith(path)) {
      return config
    }
  }
  // Fall back to default API limit
  if (pathname.startsWith('/api')) {
    return RATE_LIMITS['/api']
  }
  return null
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; remaining: number } {
  const config = getRateLimitConfig(pathname)
  if (!config) return { allowed: true, remaining: -1 }

  const key = `${ip}:${pathname}`
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  // Cleanup old entries periodically
  if (rateLimitStore.size > 10000) {
    rateLimitStore.forEach((v, k) => {
      if (v.resetAt < now) rateLimitStore.delete(k)
    })
  }

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1 }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Only apply rate limiting to API routes
  if (pathname.startsWith('/api')) {
    const ip = getClientIP(request)
    const { allowed, remaining } = checkRateLimit(ip, pathname)

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMITED' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      )
    }

    // Add rate limit headers to response
    const response = NextResponse.next()
    if (remaining >= 0) {
      response.headers.set('X-RateLimit-Remaining', String(remaining))
    }
    return response
  }

  // Admin route protection - check for admin session cookie
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const adminSession = request.cookies.get('admin_session')
    if (!adminSession?.value) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // API routes
    '/api/:path*',
    // Admin routes (except login)
    '/admin/((?!login).*)',
  ],
}
