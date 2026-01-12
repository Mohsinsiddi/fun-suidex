// ============================================
// Password Hashing Utilities (Argon2)
// ============================================

import argon2 from 'argon2'
import { AUTH } from '@/constants'

// ----------------------------------------
// Argon2 Configuration
// ----------------------------------------

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
}

// ----------------------------------------
// Password Functions
// ----------------------------------------

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
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
