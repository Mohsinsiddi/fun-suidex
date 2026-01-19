// ============================================
// NanoID - Secure Random ID Generator
// ============================================

import crypto from 'crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Generate a random ID of specified length
 * Uses crypto.randomBytes for secure randomness
 */
export function nanoid(length: number = 21): string {
  const bytes = crypto.randomBytes(length)
  let id = ''
  
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length]
  }
  
  return id
}

/**
 * Generate a random hex string
 */
export function randomHex(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Generate a cryptographically secure random number between 0 and 1
 */
export function secureRandom(): number {
  const bytes = crypto.randomBytes(4)
  return bytes.readUInt32BE(0) / 0xffffffff
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return `sess_${nanoid(24)}`
}

/**
 * Generate an admin session ID
 */
export function generateAdminSessionId(): string {
  return `admin_${nanoid(24)}`
}

/**
 * Generate a nonce for wallet signature
 */
export function generateNonce(): string {
  return `Sign this message to authenticate with SuiDex Games: ${randomHex(16)}`
}

/**
 * Generate an invite code
 */
export function generateInviteCode(): string {
  return `INV_${nanoid(12)}`
}
