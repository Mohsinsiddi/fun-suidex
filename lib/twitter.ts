import type { TweetIntentParams } from '@/types/referral'

export function generateTweetIntentUrl(params: TweetIntentParams): string {
  const { prizeAmount, prizeUSD, prizeTokenSymbol, referralLink } = params

  // Format token amount for display
  const tokenLabel = prizeAmount >= 1_000_000
    ? `${(prizeAmount / 1_000_000).toFixed(prizeAmount % 1_000_000 === 0 ? 0 : 1)}M`
    : prizeAmount >= 1_000
      ? `${Math.round(prizeAmount / 1_000)}K`
      : String(prizeAmount)
  const symbol = prizeTokenSymbol || 'VICT'

  // Use separate params per X docs: text, url, hashtags, via
  const tweetText = `My friend just won ${tokenLabel} ${symbol} (~$${prizeUSD.toFixed(2)}) on the Wheel of Victory! 🎡🔥\n\nI earned ~$${(prizeUSD * 0.1).toFixed(2)} in referral rewards!\n\nSpin yours 👉`

  const intentParams = new URLSearchParams({
    text: tweetText,
    url: referralLink,
    hashtags: 'SuiDex,WheelOfVictory',
    via: 'suidexHQ',
  })

  return `https://x.com/intent/tweet?${intentParams.toString()}`
}

export function openTweetIntent(url: string): Window | null {
  const width = 550, height = 420
  const left = (window.screen.width - width) / 2
  const top = (window.screen.height - height) / 2
  return window.open(url, 'x-share', `width=${width},height=${height},left=${left},top=${top}`)
}
