import mongoose from 'mongoose'

// Schema for temporary transfer tokens with status tracking
const TransferTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active',
  },
  encryptedData: {
    ciphertext: { type: String, required: true },
    salt: { type: String, required: true },
    iv: { type: String, required: true },
  },
  pwaWallet: { type: String, required: true },
  mainWallet: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
})

// Index for faster lookups
TransferTokenSchema.index({ token: 1 })
TransferTokenSchema.index({ mainWallet: 1 })
// TTL index - auto-delete 24 hours after expiration for cleanup
TransferTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 })

export const TransferToken = mongoose.models.TransferToken || mongoose.model('TransferToken', TransferTokenSchema)
