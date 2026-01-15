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
    <div className="flex gap-3">
      <button onClick={handleTwitter} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] transition-colors">
        <Twitter size={18} /> Share on Twitter
      </button>
      <button onClick={handleCopy} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-accent text-black hover:bg-accent-hover'}`}>
        {copied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy</>}
      </button>
    </div>
  )
}
