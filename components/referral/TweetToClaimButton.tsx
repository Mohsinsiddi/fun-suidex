'use client'

import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { useReferralStore } from '@/lib/stores/referralStore'

interface Props {
  reward: any
  onComplete: () => void
}

export default function TweetToClaimButton({ reward, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const referralLink = useReferralStore((s) => s.referralLink)

  const handleClick = async () => {
    setLoading(true)
    try {
      await fetch(`/api/referral/tweet-clicked/${reward._id}`, { method: 'POST' })

      // If the stored tweetIntentUrl is a valid X/Twitter intent, use it directly
      let tweetUrl = reward.tweetIntentUrl
      if (!tweetUrl || !tweetUrl.includes('/intent/tweet')) {
        // Construct a clean intent URL with separate params
        const prizeUSD = reward.originalPrizeUSD || reward.rewardValueUSD / 0.1
        const text = `My friend just won $${prizeUSD.toFixed(2)} on the Wheel of Victory! 🎡🔥\n\nI earned $${(prizeUSD * 0.1).toFixed(2)} in referral rewards!\n\nSpin yours 👉`
        const intentParams = new URLSearchParams({
          text,
          url: referralLink || window.location.origin,
          hashtags: 'SuiDex,WheelOfVictory',
          via: 'suidexHQ',
        })
        tweetUrl = `https://x.com/intent/tweet?${intentParams.toString()}`
      } else {
        // Migrate old twitter.com URLs to x.com
        tweetUrl = tweetUrl.replace('https://twitter.com/', 'https://x.com/')
      }

      const tweetWindow = window.open(tweetUrl, 'x-share', 'width=550,height=450')

      const check = setInterval(async () => {
        if (tweetWindow?.closed) {
          clearInterval(check)
          await fetch(`/api/referral/tweet-confirmed/${reward._id}`, { method: 'POST' })
          setDone(true)
          onComplete()
          setLoading(false)
        }
      }, 500)

      setTimeout(() => { clearInterval(check); setLoading(false) }, 300000)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/30">
        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Posted
      </span>
    )
  }

  return (
    <button onClick={handleClick} disabled={loading} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] disabled:opacity-70 transition-colors whitespace-nowrap">
      {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
      <span className="hidden xs:inline">Post to Claim</span>
      <span className="xs:hidden">Post</span>
    </button>
  )
}
