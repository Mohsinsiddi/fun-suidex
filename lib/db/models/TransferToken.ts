import mongoose from 'mongoose'

// Schema for temporary transfer tokens (one-time use, auto-expires)
const TransferTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  encryptedData: {
    ciphertext: { type: String, required: true },
    salt: { type: String, required: true },
    iv: { type: String, required: true },
  },
  pwaWallet: { type: String, required: true },
  mainWallet: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // Auto-delete after 10 minutes
})

// Index for faster lookups
TransferTokenSchema.index({ token: 1 })
TransferTokenSchema.index({ mainWallet: 1 })

export const TransferToken = mongoose.models.TransferToken || mongoose.model('TransferToken', TransferTokenSchema)
