'use client'

import { Twitter, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function ShareButtons({ referralLink }: { referralLink: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTwitter = () => {
    const text = `🎡 Spin the Wheel of Victory and win crypto prizes!\n\nJoin me on @suidexHQ 👉 ${referralLink}\n\n#SuiDex #WheelOfVictory`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <button onClick={handleTwitter} className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] transition-colors">
        <Twitter className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> Share on Twitter
      </button>
      <button onClick={handleCopy} className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all ${copied ? 'bg-green-500 text-white' : 'bg-accent text-black hover:bg-accent-hover'}`}>
        {copied ? <><Check className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> Copied!</> : <><Copy className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> Copy</>}
      </button>
    </div>
  )
}
