// ============================================
// PWA Transfer API - Create Transfer Token
// ============================================
// POST /api/pwa/transfer - Create one-time transfer token for PWA wallet data

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { TransferToken } from '@/lib/db/models/TransferToken'
import { success, errors } from '@/lib/utils/apiResponse'
import { z } from 'zod'
import crypto from 'crypto'

// Schema for transfer data
const transferSchema = z.object({
  encryptedData: z.object({
    ciphertext: z.string(),
    salt: z.string(),
    iv: z.string(),
  }),
  pwaWallet: z.string(),
  mainWallet: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = transferSchema.safeParse(body)

    if (!parsed.success) {
      return errors.badRequest('Invalid transfer data')
    }

    const { encryptedData, pwaWallet, mainWallet } = parsed.data

    await connectDB()

    // Generate unique 8-character token (easy to type manually if needed)
    const token = crypto.randomBytes(4).toString('hex').toUpperCase()

    // Delete any existing tokens for this wallet (only allow one active transfer)
    await TransferToken.deleteMany({ mainWallet: mainWallet.toLowerCase() })

    // Create new transfer token
    await TransferToken.create({
      token,
      encryptedData,
      pwaWallet: pwaWallet.toLowerCase(),
      mainWallet: mainWallet.toLowerCase(),
    })

    return success({
      token,
      expiresIn: 600, // 10 minutes
      transferUrl: `/pwa/transfer/${token}`,
    })
  } catch (error) {
    console.error('PWA transfer create error:', error)
    return errors.internal('Failed to create transfer token')
  }
}
