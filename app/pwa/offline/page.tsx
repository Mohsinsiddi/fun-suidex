'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function PWAOfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-gray-500/20 rounded-2xl flex items-center justify-center mb-6">
        <WifiOff className="w-8 h-8 text-gray-400" />
      </div>

      <h1 className="text-xl font-bold text-white mb-2">
        You're Offline
      </h1>
      <p className="text-text-secondary text-sm mb-6 max-w-xs">
        Please check your internet connection and try again.
      </p>

      <button
        onClick={handleRetry}
        className="flex items-center gap-2 px-6 py-3 bg-accent text-black rounded-xl font-medium text-sm hover:bg-accent-hover transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  )
}
