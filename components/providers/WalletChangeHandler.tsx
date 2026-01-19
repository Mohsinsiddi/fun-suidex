'use client'

// ============================================
// Wallet Change Handler
// ============================================
// Detects wallet disconnect/switch and manages state cleanup
// - On disconnect: calls logout API and resets all stores
// - On switch: resets all stores and prepares for new wallet

import { useEffect, useRef } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useAuthStore } from '@/lib/stores/authStore'
import { useConfigStore } from '@/lib/stores/configStore'
import { useReferralStore } from '@/lib/stores/referralStore'
import { useBadgesStore } from '@/lib/stores/badgesStore'

export function WalletChangeHandler() {
  const account = useCurrentAccount()
  const previousWalletRef = useRef<string | null>(null)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    const currentWallet = account?.address || null

    // Skip on first render - let normal auth flow happen
    if (!isInitializedRef.current) {
      previousWalletRef.current = currentWallet
      isInitializedRef.current = true
      return
    }

    const previousWallet = previousWalletRef.current

    // Case 1: Wallet disconnected (was connected, now null)
    if (previousWallet && !currentWallet) {
      console.log('[WalletChangeHandler] Wallet disconnected')
      handleWalletChange()
    }

    // Case 2: Wallet switched (different wallet connected)
    if (previousWallet && currentWallet && previousWallet !== currentWallet) {
      console.log('[WalletChangeHandler] Wallet switched:', previousWallet.slice(0, 8), '→', currentWallet.slice(0, 8))
      handleWalletChange()
    }

    // Case 3: Wallet connected (was null, now has address)
    if (!previousWallet && currentWallet) {
      console.log('[WalletChangeHandler] Wallet connected:', currentWallet.slice(0, 8))
      // Just track it - normal sign-in flow handles authentication
    }

    // Update ref for next change
    previousWalletRef.current = currentWallet
  }, [account?.address])

  // Handle wallet disconnect or switch
  // Uses getState() to read current store values at execution time (not stale render values)
  const handleWalletChange = async () => {
    // Read current auth state directly from store (not from render-time closure)
    const { isAuthenticated } = useAuthStore.getState()

    // Call logout API if was authenticated
    if (isAuthenticated) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (err) {
        console.error('[WalletChangeHandler] Logout API error:', err)
      }
    }

    // Reset all stores
    console.log('[WalletChangeHandler] Resetting all stores')

    // Auth store - full reset
    useAuthStore.getState().reset()

    // Referral store - full reset
    useReferralStore.getState().reset()

    // Badges store - reset user data
    useBadgesStore.getState().reset()

    // Config store - just invalidate cache (config is wallet-agnostic)
    useConfigStore.getState().invalidate()
  }

  // This component doesn't render anything
  return null
}

export default WalletChangeHandler
