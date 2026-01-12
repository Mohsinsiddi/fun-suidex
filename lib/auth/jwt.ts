// ============================================
// JWT Authentication Utilities
// ============================================

import { SignJWT, jwtVerify, JWTPayload as JosePayload } from 'jose'
import type { JWTPayload, AdminJWTPayload } from '@/types'

// ----------------------------------------
// Secrets (encoded for jose)
// ----------------------------------------

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  return new TextEncoder().encode(secret)
}

const getRefreshSecret = () => {
  const secret = process.env.REFRESH_TOKEN_SECRET
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET not configured')
  return new TextEncoder().encode(secret)
}

const getAdminSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET not configured')
  return new TextEncoder().encode(secret)
}

// ----------------------------------------
// User JWT Functions
// ----------------------------------------

/**
 * Create an access token for a user
 */
export async function createAccessToken(
  wallet: string,
  sessionId: string
): Promise<string> {
  const token = await new SignJWT({
    wallet,
    sessionId,
    type: 'access',
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getJWTSecret())
  
  return token
}

/**
 * Create a refresh token for a user
 */
export async function createRefreshToken(
  wallet: string,
  sessionId: string
): Promise<string> {
  const token = await new SignJWT({
    wallet,
    sessionId,
    type: 'refresh',
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getRefreshSecret())
  
  return token
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret())
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret())
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

// ----------------------------------------
// Admin JWT Functions
// ----------------------------------------

/**
 * Create an admin session token
 */
export async function createAdminToken(
  username: string,
  role: 'super_admin' | 'admin',
  sessionId: string
): Promise<string> {
  const token = await new SignJWT({
    username,
    role,
    sessionId,
  } as AdminJWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getAdminSecret())
  
  return token
}

/**
 * Verify an admin token
 */
export async function verifyAdminToken(token: string): Promise<AdminJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAdminSecret())
    return payload as unknown as AdminJWTPayload
  } catch {
    return null
  }
}

// ----------------------------------------
// Hash Functions (for refresh tokens)
// ----------------------------------------

import crypto from 'crypto'

/**
 * Hash a refresh token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Compare a token with its hash
 */
export function compareTokenHash(token: string, hash: string): boolean {
  return hashToken(token) === hash
}
