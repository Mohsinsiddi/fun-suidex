// ============================================
// SUI Blockchain Utilities
// ============================================

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { SUI } from '@/constants'

// ----------------------------------------
// SUI Client Singleton
// ----------------------------------------

let suiClient: SuiClient | null = null

export function getSuiClient(): SuiClient {
  if (!suiClient) {
    const rpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl('mainnet')
    suiClient = new SuiClient({ url: rpcUrl })
  }
  return suiClient
}

// ----------------------------------------
// Transaction Queries
// ----------------------------------------

export interface TransactionInfo {
  txHash: string
  sender: string
  recipient: string
  amountMIST: string
  amountSUI: number
  timestamp: Date
  blockNumber: number
  success: boolean
}

/**
 * Get transactions sent to an address within a time range
 * Used to verify spin payments
 */
export async function getIncomingTransactions(
  recipientAddress: string,
  fromTimestamp: Date,
  toTimestamp: Date = new Date()
): Promise<TransactionInfo[]> {
  const client = getSuiClient()
  const transactions: TransactionInfo[] = []
  
  try {
    // Query transactions to the recipient address
    const txns = await client.queryTransactionBlocks({
      filter: {
        ToAddress: recipientAddress,
      },
      options: {
        showInput: true,
        showEffects: true,
        showBalanceChanges: true,
      },
      limit: 50,
      order: 'descending',
    })
    
    for (const tx of txns.data) {
      // Parse timestamp
      const timestampMs = tx.timestampMs ? parseInt(tx.timestampMs) : 0
      const txTimestamp = new Date(timestampMs)
      
      // Skip if outside time range
      if (txTimestamp < fromTimestamp || txTimestamp > toTimestamp) {
        continue
      }
      
      // Find SUI balance changes
      const balanceChanges = tx.balanceChanges || []
      const suiChange = balanceChanges.find(
        (change) =>
          change.coinType === '0x2::sui::SUI' &&
          change.owner &&
          typeof change.owner === 'object' &&
          'AddressOwner' in change.owner &&
          change.owner.AddressOwner.toLowerCase() === recipientAddress.toLowerCase() &&
          BigInt(change.amount) > 0
      )
      
      if (!suiChange) continue
      
      // Get sender from transaction input
      const sender = tx.transaction?.data?.sender || ''
      
      transactions.push({
        txHash: tx.digest,
        sender: sender.toLowerCase(),
        recipient: recipientAddress.toLowerCase(),
        amountMIST: suiChange.amount,
        amountSUI: parseFloat(suiChange.amount) / SUI.MIST_PER_SUI,
        timestamp: txTimestamp,
        blockNumber: tx.checkpoint ? parseInt(tx.checkpoint) : 0,
        success: tx.effects?.status?.status === 'success',
      })
    }
  } catch (error) {
    console.error('Error fetching transactions:', error)
  }
  
  return transactions
}

/**
 * Get a specific transaction by hash
 */
export async function getTransaction(txHash: string): Promise<TransactionInfo | null> {
  const client = getSuiClient()
  
  try {
    const tx = await client.getTransactionBlock({
      digest: txHash,
      options: {
        showInput: true,
        showEffects: true,
        showBalanceChanges: true,
      },
    })
    
    if (!tx) return null
    
    // Find SUI balance change to recipient
    const balanceChanges = tx.balanceChanges || []
    const suiChange = balanceChanges.find(
      (change) =>
        change.coinType === '0x2::sui::SUI' &&
        BigInt(change.amount) > 0
    )
    
    if (!suiChange) return null
    
    const recipient =
      suiChange.owner &&
      typeof suiChange.owner === 'object' &&
      'AddressOwner' in suiChange.owner
        ? suiChange.owner.AddressOwner
        : ''
    
    const timestampMs = tx.timestampMs ? parseInt(tx.timestampMs) : 0
    
    return {
      txHash: tx.digest,
      sender: (tx.transaction?.data?.sender || '').toLowerCase(),
      recipient: recipient.toLowerCase(),
      amountMIST: suiChange.amount,
      amountSUI: parseFloat(suiChange.amount) / SUI.MIST_PER_SUI,
      timestamp: new Date(timestampMs),
      blockNumber: tx.checkpoint ? parseInt(tx.checkpoint) : 0,
      success: tx.effects?.status?.status === 'success',
    }
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return null
  }
}

/**
 * Verify a payment transaction
 * Returns transaction info if valid, null otherwise
 */
export async function verifyPayment(
  txHash: string,
  expectedSender: string,
  expectedRecipient: string,
  minAmountSUI: number
): Promise<TransactionInfo | null> {
  const tx = await getTransaction(txHash)
  
  if (!tx) {
    console.log('Transaction not found:', txHash)
    return null
  }
  
  // Verify sender
  if (tx.sender.toLowerCase() !== expectedSender.toLowerCase()) {
    console.log('Sender mismatch:', tx.sender, expectedSender)
    return null
  }
  
  // Verify recipient
  if (tx.recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
    console.log('Recipient mismatch:', tx.recipient, expectedRecipient)
    return null
  }
  
  // Verify amount
  if (tx.amountSUI < minAmountSUI) {
    console.log('Amount too low:', tx.amountSUI, minAmountSUI)
    return null
  }
  
  // Verify success
  if (!tx.success) {
    console.log('Transaction failed')
    return null
  }
  
  return tx
}

// ----------------------------------------
// Utility Functions
// ----------------------------------------

/**
 * Convert MIST to SUI
 */
export function mistToSui(mist: string | bigint): number {
  return Number(BigInt(mist)) / SUI.MIST_PER_SUI
}

/**
 * Convert SUI to MIST
 */
export function suiToMist(sui: number): bigint {
  return BigInt(Math.floor(sui * SUI.MIST_PER_SUI))
}

/**
 * Format SUI amount for display
 */
export function formatSui(amount: number, decimals: number = 4): string {
  return amount.toFixed(decimals).replace(/\.?0+$/, '')
}

/**
 * Validate SUI address format
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address)
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}
