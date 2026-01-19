// ============================================
// Password Hashing Utilities (bcryptjs)
// ============================================
// Using bcryptjs (pure JS) for Vercel compatibility

import bcrypt from 'bcryptjs'
import { AUTH } from '@/constants'

// ----------------------------------------
// Bcrypt Configuration
// ----------------------------------------

// Cost factor: 12 is a good balance between security and performance
// Higher = more secure but slower (each +1 doubles the time)
const SALT_ROUNDS = 12

// ----------------------------------------
// Password Functions
// ----------------------------------------

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

/**
 * Validate password strength
 * Returns error message if invalid, null if valid
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required'
  }

  if (password.length < AUTH.MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`
  }

  if (password.length > 128) {
    return 'Password must be less than 128 characters'
  }

  // Optional: Add more strength requirements
  // const hasUppercase = /[A-Z]/.test(password)
  // const hasLowercase = /[a-z]/.test(password)
  // const hasNumber = /[0-9]/.test(password)
  // const hasSpecial = /[!@#$%^&*]/.test(password)

  return null
}

/**
 * Validate username format
 * Returns error message if invalid, null if valid
 */
export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Username is required'
  }

  if (username.length < 3) {
    return 'Username must be at least 3 characters'
  }

  if (username.length > 30) {
    return 'Username must be less than 30 characters'
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'Username can only contain lowercase letters, numbers, and underscores'
  }

  return null
}
