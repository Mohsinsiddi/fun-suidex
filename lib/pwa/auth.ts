// ============================================
// PWA Authentication Utilities
// ============================================
// Wallet derivation and signature verification for PWA

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { verifyPersonalMessageSignature } from '@mysten/sui/verify'
import crypto from 'crypto'

// ----------------------------------------
// Constants
// ----------------------------------------

export const PWA_DERIVATION_MESSAGE_PREFIX = 'SuiDex PWA Wallet v1:'
export const PWA_AUTH_MESSAGE_PREFIX = 'SuiDex PWA Auth:'
export const PWA_UNLOCK_MIN_SPINS = 25

// ----------------------------------------
// Derivation Message
// ----------------------------------------

/**
 * Create the message that main wallet must sign to derive PWA wallet.
 * This message is deterministic - same wallet always gets same message.
 */
export function createDerivationMessage(mainWallet: string): string {
  return `${PWA_DERIVATION_MESSAGE_PREFIX}${mainWallet.toLowerCase()}`
}

// ----------------------------------------
// Wallet Derivation
// ----------------------------------------

/**
 * Derive a deterministic PWA wallet from a signature.
 * Same signature always produces same wallet (recoverable).
 *
 * Flow:
 * 1. Main wallet signs derivation message
 * 2. SHA256(signature) = 32-byte seed
 * 3. Ed25519Keypair from seed = PWA wallet
 */
export function derivePWAWallet(signature: string): {
  keypair: Ed25519Keypair
  address: string
  seed: string
} {
  // Create deterministic seed from signature
  const seed = crypto
    .createHash('sha256')
    .update(Buffer.from(signature, 'base64'))
    .digest('hex')

  // Derive Ed25519 keypair (needs 32 bytes = 64 hex chars)
  const keypair = Ed25519Keypair.deriveKeypairFromSeed(seed.slice(0, 64))

  return {
    keypair,
    address: keypair.getPublicKey().toSuiAddress(),
    seed,
  }
}

/**
 * Verify that a claimed PWA wallet matches the derived address.
 * Used during linking to ensure client didn't tamper with address.
 */
export function verifyDerivedWallet(
  signature: string,
  claimedPwaWallet: string
): boolean {
  const { address } = derivePWAWallet(signature)
  return address.toLowerCase() === claimedPwaWallet.toLowerCase()
}

// ----------------------------------------
// Signature Verification
// ----------------------------------------

/**
 * Verify that main wallet signed the derivation message.
 * Used during PWA linking to prove ownership.
 */
export async function verifyDerivationSignature(
  mainWallet: string,
  signature: string
): Promise<boolean> {
  try {
    const message = createDerivationMessage(mainWallet)
    const messageBytes = new TextEncoder().encode(message)
    const publicKey = await verifyPersonalMessageSignature(messageBytes, signature)
    return publicKey.toSuiAddress().toLowerCase() === mainWallet.toLowerCase()
  } catch {
    return false
  }
}

/**
 * Verify a signature from PWA wallet.
 * Used during PWA authentication.
 */
export async function verifyPWASignature(
  pwaWallet: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(message)
    const publicKey = await verifyPersonalMessageSignature(messageBytes, signature)
    return publicKey.toSuiAddress().toLowerCase() === pwaWallet.toLowerCase()
  } catch {
    return false
  }
}

// ----------------------------------------
// PWA Auth Message
// ----------------------------------------

/**
 * Create authentication challenge message for PWA login.
 * Includes timestamp to prevent replay attacks.
 */
export function createPWAAuthMessage(pwaWallet: string, timestamp: number): string {
  return `${PWA_AUTH_MESSAGE_PREFIX}${pwaWallet.toLowerCase()}:${timestamp}`
}

/**
 * Validate that timestamp is within acceptable range (5 minutes).
 */
export function isTimestampValid(timestamp: number, maxAgeMs = 5 * 60 * 1000): boolean {
  const now = Date.now()
  return Math.abs(now - timestamp) <= maxAgeMs
}
