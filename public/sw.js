// ============================================
// SuiDex Games Service Worker
// ============================================
// Handles push notifications and basic caching
// IMPORTANT: Push notifications work independently of app state
// They should be received even when app is closed/minimized

const CACHE_NAME = 'suidex-pwa-v2'
const OFFLINE_URL = '/pwa/offline'

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/pwa',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Activate immediately - important for push notifications to work right away
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all pages immediately - critical for push notifications
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

// Push notification event - CRITICAL: This runs even when app is closed/minimized
// The browser wakes up the service worker to handle push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received')

  // Always show a notification, even if data is missing
  let payload = {
    title: 'SuiDex Games',
    body: 'You have a new notification',
  }

  if (event.data) {
    try {
      payload = event.data.json()
      console.log('[SW] Push payload:', payload)
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error)
      // Try as text
      try {
        payload.body = event.data.text()
      } catch (e) {
        // Use default message
      }
    }
  }

  const options = {
    body: payload.body || 'You have a new notification',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    tag: payload.tag || 'suidex-notification',
    requireInteraction: payload.requireInteraction || false,
    data: payload.data || {},
    actions: payload.actions || [],
    vibrate: [200, 100, 200],
    // Renotify allows showing notification even if tag already exists
    renotify: true,
  }

  // waitUntil keeps the service worker alive until the notification is shown
  event.waitUntil(
    self.registration.showNotification(
      payload.title || 'SuiDex Games',
      options
    ).then(() => {
      console.log('[SW] Notification shown successfully')
    }).catch((error) => {
      console.error('[SW] Failed to show notification:', error)
    })
  )
})

// Notification click event - handles clicks even when app is closed
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)
  event.notification.close()

  const data = event.notification.data || {}
  let url = '/pwa/home'

  // Determine URL based on notification type
  if (data.type === 'prize_distributed') {
    url = '/pwa/history'
  } else if (data.type === 'affiliate_reward') {
    url = '/pwa/history'
  } else if (data.type === 'new_referral') {
    url = '/pwa/home'
  } else if (data.type === 'free_spins') {
    url = '/pwa/game'
  } else if (data.type === 'spins_credited') {
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

  // Get the full URL
  const fullUrl = new URL(url, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open with our app
      for (const client of windowClients) {
        // Check if any window is on our origin
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          // Navigate the existing window to the target URL
          return client.navigate(fullUrl).then(() => client.focus())
        }
      }

      // No existing window - open a new one
      if (clients.openWindow) {
        return clients.openWindow(fullUrl)
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
