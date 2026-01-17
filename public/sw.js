// ============================================
// SuiDex Games Service Worker
// ============================================
// Handles push notifications and basic caching

const CACHE_NAME = 'suidex-pwa-v1'
const OFFLINE_URL = '/pwa/offline'

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/pwa',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip API calls and non-navigation requests
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response for caching
        const responseClone = response.clone()

        // Cache successful responses for PWA routes
        if (response.ok && url.pathname.startsWith('/pwa')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }

        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          // For navigation requests, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL)
          }

          // Return a simple offline response for other requests
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          })
        })
      })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const payload = event.data.json()

    const options = {
      body: payload.body || 'You have a new notification',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/badge-72.png',
      tag: payload.tag || 'default',
      requireInteraction: payload.requireInteraction || false,
      data: payload.data || {},
      actions: payload.actions || [],
      vibrate: [100, 50, 100],
    }

    event.waitUntil(
      self.registration.showNotification(
        payload.title || 'SuiDex Games',
        options
      )
    )
  } catch (error) {
    console.error('Push notification error:', error)
  }
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  let url = '/pwa/game'

  // Determine URL based on notification type
  if (data.type === 'prize_distributed') {
    url = '/pwa/history'
  } else if (data.type === 'affiliate_reward') {
    url = '/pwa/history'
  } else if (data.type === 'new_referral') {
    url = '/pwa/game'
  } else if (data.type === 'free_spins') {
    url = '/pwa/game'
  }

  // Handle action clicks
  if (event.action) {
    switch (event.action) {
      case 'play':
        url = '/pwa/game'
        break
      case 'history':
        url = '/pwa/history'
        break
      case 'dismiss':
        return // Just close the notification
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes('/pwa') && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }

      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-spins') {
    event.waitUntil(syncPendingSpins())
  }
})

async function syncPendingSpins() {
  // This would sync any pending spin results when back online
  // For now, we just log it
  console.log('Syncing pending spins...')
}

// Message event for communication with the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
