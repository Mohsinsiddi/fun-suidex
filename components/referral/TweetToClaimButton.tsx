'use client'

import { useState } from 'react'
import { Twitter, Loader2, Check } from 'lucide-react'

interface Props {
  reward: any
  onComplete: () => void
}

export default function TweetToClaimButton({ reward, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await fetch(`/api/referral/tweet-clicked/${reward._id}`, { method: 'POST' })

      const link = reward.tweetIntentUrl || `https://games.suidex.io?ref=${reward.referrerWallet}`
      const prizeUSD = reward.originalPrizeUSD || reward.rewardValueUSD / 0.1
      const text = `My friend just won $${prizeUSD.toFixed(2)} on the Wheel of Victory! 🎡🔥\n\nI earned $${(prizeUSD * 0.1).toFixed(2)} in referral rewards!\n\nSpin yours 👉 ${link}\n\n@suidexHQ #SuiDex #WheelOfVictory`
      
      const tweetWindow = window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, 'twitter', 'width=550,height=450')

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
        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Tweeted
      </span>
    )
  }

  return (
    <button onClick={handleClick} disabled={loading} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] disabled:opacity-70 transition-colors whitespace-nowrap">
      {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
      <span className="hidden xs:inline">Tweet to Claim</span>
      <span className="xs:hidden">Tweet</span>
    </button>
  )
}
