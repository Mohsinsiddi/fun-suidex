// ============================================
// Web Push Notifications
// ============================================
// Server-side utility for sending push notifications

import webpush from 'web-push'

// Initialize VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@suidex.games'

// Configure web-push if keys are available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, unknown>
  tag?: string
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

/**
 * Send a push notification to a subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured - push notifications disabled')
    return { success: false, error: 'Push notifications not configured' }
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    }

    // Default icon if not provided (uses SVG fallback)
    const finalPayload: PushPayload = {
      ...payload,
      icon: payload.icon || '/icons/icon.svg',
      badge: payload.badge || '/icons/icon.svg',
    }

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(finalPayload)
    )

    return { success: true }
  } catch (error: any) {
    console.error('Push notification error:', error)

    // Handle specific errors
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription is no longer valid
      return { success: false, error: 'subscription_expired' }
    }

    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Send push notification for prize distribution
 */
export async function sendPrizeDistributedPush(
  subscription: PushSubscription,
  prizeValueUSD: number,
  prizeTokenSymbol: string
): Promise<{ success: boolean; error?: string }> {
  return sendPushNotification(subscription, {
    title: '🎉 Prize Distributed!',
    body: `Your $${prizeValueUSD} ${prizeTokenSymbol} prize has been sent to your wallet!`,
    tag: 'prize-distributed',
    data: {
      type: 'prize_distributed',
      prizeValueUSD,
      prizeTokenSymbol,
    },
  })
}

/**
 * Send push notification for affiliate reward payment
 */
export async function sendAffiliateRewardPush(
  subscription: PushSubscription,
  amountUSD: number
): Promise<{ success: boolean; error?: string }> {
  return sendPushNotification(subscription, {
    title: '💰 Referral Reward!',
    body: `You earned $${amountUSD.toFixed(2)} from your referrals!`,
    tag: 'affiliate-reward',
    data: {
      type: 'affiliate_reward',
      amountUSD,
    },
  })
}

/**
 * Send push notification for new referral signup
 */
export async function sendNewReferralPush(
  subscription: PushSubscription
): Promise<{ success: boolean; error?: string }> {
  return sendPushNotification(subscription, {
    title: '👋 New Referral!',
    body: 'Someone signed up with your referral code!',
    tag: 'new-referral',
    data: {
      type: 'new_referral',
    },
  })
}

/**
 * Send push notification for free spins granted
 */
export async function sendFreeSpinsPush(
  subscription: PushSubscription,
  spinsCount: number
): Promise<{ success: boolean; error?: string }> {
  return sendPushNotification(subscription, {
    title: '🎰 Free Spins!',
    body: `You received ${spinsCount} free spin${spinsCount > 1 ? 's' : ''}!`,
    tag: 'free-spins',
    data: {
      type: 'free_spins',
      spinsCount,
    },
  })
}

/**
 * Send push notification for spins credited by admin
 */
export async function sendSpinsCreditedPush(
  subscription: PushSubscription,
  spinsCount: number,
  spinType: 'purchased' | 'bonus'
): Promise<{ success: boolean; error?: string }> {
  const emoji = spinType === 'bonus' ? '🎁' : '🎰'
  const typeLabel = spinType === 'bonus' ? 'bonus' : 'purchased'

  return sendPushNotification(subscription, {
    title: `${emoji} Spins Credited!`,
    body: `You received ${spinsCount} ${typeLabel} spin${spinsCount > 1 ? 's' : ''}! Go spin the wheel!`,
    tag: 'spins-credited',
    data: {
      type: 'spins_credited',
      spinsCount,
      spinType,
    },
  })
}
