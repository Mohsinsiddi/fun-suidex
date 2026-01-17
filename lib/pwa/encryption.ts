// ============================================
// PWA PIN Encryption Utilities
// ============================================
// Client-side encryption of PWA wallet private key with PIN
// NOTE: This file is used on the CLIENT (browser) only

// ----------------------------------------
// Constants
// ----------------------------------------

const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_LENGTH = 256

// ----------------------------------------
// Key Derivation
// ----------------------------------------

/**
 * Derive an AES key from PIN using PBKDF2.
 * Uses Web Crypto API (client-side).
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const pinBuffer = encoder.encode(pin)

  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

// ----------------------------------------
// Encryption
// ----------------------------------------

export interface EncryptedData {
  ciphertext: string  // Base64
  salt: string        // Base64
  iv: string          // Base64
}

/**
 * Encrypt private key with PIN.
 * Returns encrypted data that can be stored in localStorage.
 */
export async function encryptWithPIN(
  privateKey: string,
  pin: string
): Promise<EncryptedData> {
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  // Derive key from PIN
  const key = await deriveKey(pin, salt)

  // Encrypt private key
  const encoder = new TextEncoder()
  const plaintext = encoder.encode(privateKey)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  )

  // Return as base64 strings for storage
  return {
    ciphertext: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(ciphertext)))),
    salt: btoa(String.fromCharCode.apply(null, Array.from(salt))),
    iv: btoa(String.fromCharCode.apply(null, Array.from(iv))),
  }
}

// ----------------------------------------
// Decryption
// ----------------------------------------

/**
 * Decrypt private key with PIN.
 * Returns null if PIN is wrong or data is corrupted.
 */
export async function decryptWithPIN(
  encryptedData: EncryptedData,
  pin: string
): Promise<string | null> {
  try {
    // Decode base64 strings
    const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0))
    const salt = Uint8Array.from(atob(encryptedData.salt), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0))

    // Derive key from PIN
    const key = await deriveKey(pin, salt)

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )

    // Decode and return
    const decoder = new TextDecoder()
    return decoder.decode(plaintext)
  } catch {
    // Wrong PIN or corrupted data
    return null
  }
}

// ----------------------------------------
// PIN Validation
// ----------------------------------------

/**
 * Validate PIN format (6 digits).
 */
export function isValidPIN(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

// ----------------------------------------
// Storage Keys
// ----------------------------------------

export const PWA_STORAGE_KEYS = {
  ENCRYPTED_KEY: 'suidex_pwa_encrypted_key',
  PWA_WALLET: 'suidex_pwa_wallet',
  MAIN_WALLET: 'suidex_pwa_main_wallet',
  ACCESS_TOKEN: 'suidex_pwa_access_token',
  REFRESH_TOKEN: 'suidex_pwa_refresh_token',
  PIN_ATTEMPTS: 'suidex_pwa_pin_attempts',
} as const

/**
 * Store encrypted wallet data in localStorage.
 */
export function storeEncryptedWallet(
  encryptedData: EncryptedData,
  pwaWallet: string,
  mainWallet: string
): void {
  localStorage.setItem(PWA_STORAGE_KEYS.ENCRYPTED_KEY, JSON.stringify(encryptedData))
  localStorage.setItem(PWA_STORAGE_KEYS.PWA_WALLET, pwaWallet)
  localStorage.setItem(PWA_STORAGE_KEYS.MAIN_WALLET, mainWallet)
  localStorage.setItem(PWA_STORAGE_KEYS.PIN_ATTEMPTS, '0')
}

/**
 * Get stored encrypted wallet data.
 */
export function getStoredWallet(): {
  encryptedData: EncryptedData
  pwaWallet: string
  mainWallet: string
} | null {
  const encryptedStr = localStorage.getItem(PWA_STORAGE_KEYS.ENCRYPTED_KEY)
  const pwaWallet = localStorage.getItem(PWA_STORAGE_KEYS.PWA_WALLET)
  const mainWallet = localStorage.getItem(PWA_STORAGE_KEYS.MAIN_WALLET)

  if (!encryptedStr || !pwaWallet || !mainWallet) return null

  try {
    const encryptedData = JSON.parse(encryptedStr) as EncryptedData
    return { encryptedData, pwaWallet, mainWallet }
  } catch {
    return null
  }
}

/**
 * Clear all PWA wallet data (wrong PIN too many times).
 */
export function clearStoredWallet(): void {
  Object.values(PWA_STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
}

/**
 * Track PIN attempts. Returns remaining attempts.
 * Clears storage after 5 failed attempts.
 */
export function trackPINAttempt(success: boolean): number {
  if (success) {
    localStorage.setItem(PWA_STORAGE_KEYS.PIN_ATTEMPTS, '0')
    return 5
  }

  const attempts = parseInt(localStorage.getItem(PWA_STORAGE_KEYS.PIN_ATTEMPTS) || '0', 10) + 1
  localStorage.setItem(PWA_STORAGE_KEYS.PIN_ATTEMPTS, attempts.toString())

  if (attempts >= 5) {
    clearStoredWallet()
    return 0
  }

  return 5 - attempts
}

/**
 * Store JWT tokens.
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(PWA_STORAGE_KEYS.ACCESS_TOKEN, accessToken)
  localStorage.setItem(PWA_STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
}

/**
 * Get stored tokens.
 */
export function getStoredTokens(): { accessToken: string; refreshToken: string } | null {
  const accessToken = localStorage.getItem(PWA_STORAGE_KEYS.ACCESS_TOKEN)
  const refreshToken = localStorage.getItem(PWA_STORAGE_KEYS.REFRESH_TOKEN)

  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}
