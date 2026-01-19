'use client'

import { useState } from 'react'
import { Copy, Check, Share2, Twitter } from 'lucide-react'

interface ProfileShareButtonProps {
  slug: string
  displayName?: string
}

export function ProfileShareButton({ slug, displayName }: ProfileShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/u/${slug}`
    : `/u/${slug}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleTwitterShare = () => {
    const text = displayName
      ? `Check out ${displayName}'s profile on SuiDex Games!`
      : 'Check out my profile on SuiDex Games!'
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`
    window.open(url, '_blank', 'width=550,height=450')
  }

  return (
    <div className="flex items-center gap-2">
      {/* Copy Link Button */}
      <button
        onClick={handleCopy}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
          ${copied
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-white/[0.03] text-text-secondary hover:text-white border border-white/[0.08] hover:border-white/[0.15]'
          }
        `}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy Link
          </>
        )}
      </button>

      {/* Twitter Share */}
      <button
        onClick={handleTwitterShare}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/20 transition-colors"
      >
        <Twitter className="w-4 h-4" />
        Tweet
      </button>
    </div>
  )
}
