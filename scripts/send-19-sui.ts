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
  console.log('Admin:', ADMIN)
  console.log('Sending 19 SUI transfers (0.001 SUI each)...\n')

  let success = 0
  let failed = 0

  for (let i = 0; i < 19; i++) {
    try {
      const tx = new Transaction()
      const [coin] = tx.splitCoins(tx.gas, [1_000_000])
      tx.transferObjects([coin], ADMIN)
      const result = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx })
      success++
      console.log(`[${i + 1}/19] OK ${result.digest}`)
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[${i + 1}/19] FAIL ${msg.slice(0, 80)}`)
      if (/rate|429|too many/i.test(msg)) {
        console.log('  Rate limited, waiting 3s...')
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
  }

  console.log(`\nDone: ${success} sent, ${failed} failed`)
  console.log(`Total SUI: ${(success * 0.001).toFixed(3)} SUI`)
}

main()
