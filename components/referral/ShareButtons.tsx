'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function ShareButtons({ referralLink }: { referralLink: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    const text = '🎡 Spin the Wheel of Victory and win crypto prizes!\n\nJoin me 👉'
    const intentParams = new URLSearchParams({
      text,
      url: referralLink,
      hashtags: 'SuiDex,WheelOfVictory',
      via: 'suidexHQ',
    })
    window.open(`https://x.com/intent/tweet?${intentParams.toString()}`, '_blank')
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] transition-colors">
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Share on X
      </button>
      <button onClick={handleCopy} className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all ${copied ? 'bg-green-500 text-white' : 'bg-accent text-black hover:bg-accent-hover'}`}>
        {copied ? <><Check className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> Copied!</> : <><Copy className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> Copy</>}
      </button>
    </div>
  )
}
