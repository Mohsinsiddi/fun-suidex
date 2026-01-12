// ============================================
// Auth Nonce API
// ============================================
// POST /api/auth/nonce - Generate nonce for wallet signature

import { NextRequest, NextResponse } from 'next/server'
import { generateNonce } from '@/lib/utils/nanoid'
import { isValidSuiAddress } from '@/lib/sui/client'

// In-memory nonce store (use Redis in production)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>()

// Clean expired nonces periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of nonceStore.entries()) {
    if (value.expiresAt < now) {
      nonceStore.delete(key)
    }
  }
}, 60000) // Every minute

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet } = body

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!isValidSuiAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400 }
      )
    }

    // Generate nonce message
    const randomPart = generateNonce()
    const nonce = `Sign this message to authenticate with SuiDex Games:\n\nNonce: ${randomPart}\nTimestamp: ${Date.now()}`
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    // Store nonce
    nonceStore.set(wallet.toLowerCase(), { nonce, expiresAt })

    return NextResponse.json({
      success: true,
      data: { nonce },
    })
  } catch (error) {
    console.error('Nonce generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate nonce' },
      { status: 500 }
    )
  }
}

// Export for use in verify endpoint
export function getNonce(wallet: string): { nonce: string; expiresAt: number } | null {
  return nonceStore.get(wallet.toLowerCase()) || null
}

export function deleteNonce(wallet: string): void {
  nonceStore.delete(wallet.toLowerCase())
}
