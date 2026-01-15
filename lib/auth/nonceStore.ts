// ============================================
// Nonce Store for Authentication
// ============================================
// In-memory nonce store (use Redis in production)

const nonceStore = new Map<string, { nonce: string; expiresAt: number }>()

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
