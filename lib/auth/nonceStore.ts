// ============================================
// Nonce Store for Authentication
// ============================================
// In-memory nonce store (use Redis in production)
// Uses global to persist across Next.js hot reloads in development

declare global {
  // eslint-disable-next-line no-var
  var __nonceStore: Map<string, { nonce: string; expiresAt: number }> | undefined
}

// Use global store in development to survive hot reloads
const nonceStore = global.__nonceStore || new Map<string, { nonce: string; expiresAt: number }>()

if (process.env.NODE_ENV !== 'production') {
  global.__nonceStore = nonceStore
}

// Clean expired nonces periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    nonceStore.forEach((value, key) => {
      if (value.expiresAt < now) {
        nonceStore.delete(key)
      }
    })
  }, 60000) // Every minute
}

export function setNonce(wallet: string, nonce: string, expiresAt: number): void {
  nonceStore.set(wallet.toLowerCase(), { nonce, expiresAt })
}

export function getNonce(wallet: string): { nonce: string; expiresAt: number } | null {
  return nonceStore.get(wallet.toLowerCase()) || null
}

export function deleteNonce(wallet: string): void {
  nonceStore.delete(wallet.toLowerCase())
}

/**
 * Validate and consume nonce (one-time use)
 * Returns validation result and auto-deletes on success
 */
export function validateAndConsumeNonce(
  wallet: string,
  providedNonce: string
): { valid: true; nonce: string } | { valid: false; reason: string } {
  const stored = getNonce(wallet)

  if (!stored) {
    return { valid: false, reason: 'No nonce found. Please request a new one.' }
  }

  if (stored.expiresAt < Date.now()) {
    deleteNonce(wallet)
    return { valid: false, reason: 'Nonce expired. Please request a new one.' }
  }

  if (stored.nonce !== providedNonce) {
    return { valid: false, reason: 'Nonce mismatch.' }
  }

  // Consume nonce (one-time use prevents replay attacks)
  deleteNonce(wallet)

  return { valid: true, nonce: stored.nonce }
}
