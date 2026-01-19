// ============================================
// Auth Nonce API
// ============================================
// POST /api/auth/nonce - Generate nonce for wallet signature

import { NextRequest, NextResponse } from 'next/server'
import { generateNonce } from '@/lib/utils/nanoid'
import { setNonce } from '@/lib/auth/nonceStore'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { validateBody, authNonceSchema } from '@/lib/validations'
import { errors } from '@/lib/utils/apiResponse'

export async function POST(request: NextRequest) {
  try {
    // Rate limit check (IP-based for unauthenticated endpoint)
    const rateLimit = checkRateLimit(request, 'auth')
    if (!rateLimit.allowed) {
      return errors.rateLimited(rateLimit.resetIn)
    }

    // Validate request body
    const { data, error } = await validateBody(request, authNonceSchema)
    if (error) return error

    const { wallet } = data

    // Generate nonce message
    const randomPart = generateNonce()
    const nonce = `Sign this message to authenticate with SuiDex Games:\n\nNonce: ${randomPart}\nTimestamp: ${Date.now()}`
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    // Store nonce
    setNonce(wallet, nonce, expiresAt)

    return NextResponse.json({
      success: true,
      data: { nonce },
    })
  } catch (error) {
    console.error('Nonce generation error:', error)
    return errors.internal('Failed to generate nonce')
  }
}
