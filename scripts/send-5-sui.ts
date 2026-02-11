#!/usr/bin/env tsx
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'

const ADMIN = '0xd86db01c43b2c04de7da56e76616db15e8cde5849e5fe8fd7314ccd4cb8d4332'

async function main() {
  const pk = process.env.SENDER_PRIVATE_KEY
  if (!pk) { console.error('Missing SENDER_PRIVATE_KEY'); process.exit(1) }

  const keypair = Ed25519Keypair.fromSecretKey(pk)
  const sender = keypair.getPublicKey().toSuiAddress()
  const client = new SuiClient({ url: getFullnodeUrl('testnet') })

  console.log('Sender:', sender)
  console.log('Sending 5 unique SUI transfers (0.001 SUI each)...\n')

  const digests = new Set<string>()
  let attempts = 0
  const MAX_ATTEMPTS = 15

  while (digests.size < 5 && attempts < MAX_ATTEMPTS) {
    attempts++
    try {
      const tx = new Transaction()
      const [coin] = tx.splitCoins(tx.gas, [1_000_000])
      tx.transferObjects([coin], ADMIN)
      const result = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx })

      if (digests.has(result.digest)) {
        console.log(`[attempt ${attempts}] duplicate ${result.digest.slice(0, 16)}... skipping`)
        // Wait before retry to avoid duplicate
        await new Promise((r) => setTimeout(r, 1500))
        continue
      }

      digests.add(result.digest)
      console.log(`[${digests.size}/5] ${result.digest}`)

      // Small delay between TXs to avoid duplicates
      await new Promise((r) => setTimeout(r, 500))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[attempt ${attempts}] FAIL ${msg.slice(0, 80)}`)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  console.log(`\nDone: ${digests.size} unique TXs in ${attempts} attempts`)
  console.log(`Total: ${(digests.size * 0.001).toFixed(3)} SUI`)
}

main()
