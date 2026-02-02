'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        // Register with root scope so push notifications work even when app is closed/minimized
        // The SW needs root scope to receive push events regardless of which page is open
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000) // Check every hour

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New content is available, optionally notify user
                console.log('New PWA version available')
              }
            })
          }
        })

        console.log('Service Worker registered successfully with root scope')
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()

    // Cleanup on unmount
    return () => {
      // Nothing to clean up
    }
  }, [])

  // This component doesn't render anything
  return null
}
