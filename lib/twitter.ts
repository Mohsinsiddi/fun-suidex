import type { TweetIntentParams } from '@/types/referral'

export function generateTweetIntentUrl(params: TweetIntentParams): string {
  const { prizeUSD, referralLink } = params
  const tweetText = `My friend just won $${prizeUSD.toFixed(2)} on the Wheel of Victory! 🎡🔥

I earned $${(prizeUSD * 0.1).toFixed(2)} in referral rewards!

Spin yours 👉 ${referralLink}

@suidexHQ #SuiDex #WheelOfVictory`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
}

export function openTweetIntent(url: string): Window | null {
  const width = 550, height = 420
  const left = (window.screen.width - width) / 2
  const top = (window.screen.height - height) / 2
  return window.open(url, 'twitter-share', `width=${width},height=${height},left=${left},top=${top}`)
}
