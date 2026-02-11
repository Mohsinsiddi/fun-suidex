export interface ReferralStats {
  totalReferred: number
  activeReferred: number
  totalEarningsVICT: number
  totalEarningsUSD: number
  pendingEarningsVICT: number
  pendingTweets: number
  readyForPayout: number
  paidOut: number
}

export interface AffiliateRewardType {
  _id: string
  referrerWallet: string
  refereeWallet: string
  fromSpinId: string
  originalPrizeVICT: number
  originalPrizeUSD: number
  commissionRate: number
  rewardAmountVICT: number
  rewardValueUSD: number
  tweetStatus: 'pending' | 'clicked' | 'completed'
  tweetClickedAt: string | null
  tweetReturnedAt: string | null
  tweetIntentUrl: string
  weekEnding: string
  payoutStatus: 'pending_tweet' | 'ready' | 'paid'
  paidAt: string | null
  paidTxHash: string | null
  createdAt: string
}

export interface TweetIntentParams {
  prizeAmount: number
  prizeUSD: number
  prizeTokenSymbol?: string
  referralLink: string
}
