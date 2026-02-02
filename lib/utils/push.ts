// ============================================
// Push Notification Utilities (Client-side)
// ============================================

/**
 * Convert a URL-safe base64 encoded VAPID public key to a Uint8Array
 * Required for the Web Push API's applicationServerKey parameter
 *
 * @param base64String - The VAPID public key in URL-safe base64 format
 * @returns Uint8Array suitable for pushManager.subscribe()
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Add padding if necessary
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  // Convert URL-safe base64 to standard base64
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  // Decode base64 to binary string
  const rawData = window.atob(base64)

  // Convert binary string to Uint8Array
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Check if the current browser/platform supports push notifications
 *
 * @returns Object with support status and reason if not supported
 */
export function checkPushSupport(): { supported: boolean; reason?: string } {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Not in browser environment' }
  }

  // Check for Notification API
  if (!('Notification' in window)) {
    return { supported: false, reason: 'Notifications not supported on this device' }
  }

  // Check for Service Worker API
  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'Service Workers not supported on this browser' }
  }

  // Check for PushManager API
  if (!('PushManager' in window)) {
    return { supported: false, reason: 'Push notifications not supported on this browser' }
  }

  // Check for iOS Safari (no push support even with PWA)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    // iOS 16.4+ supports push notifications in PWA mode
    // But only when installed as PWA, not in Safari browser
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true

    if (!isStandalone) {
      return {
        supported: false,
        reason: 'On iOS, push notifications only work when the app is installed to your Home Screen. Please add the app first.'
      }
    }

    // Check iOS version - push support requires iOS 16.4+
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)/)
    if (match) {
      const major = parseInt(match[1], 10)
      const minor = parseInt(match[2], 10)
      if (major < 16 || (major === 16 && minor < 4)) {
        return {
          supported: false,
          reason: 'Push notifications require iOS 16.4 or later. Please update your device.'
        }
      }
    }
  }

  return { supported: true }
}

/**
 * Check if notification permission is granted
 */
export function isNotificationPermissionGranted(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }
  return Notification.permission === 'granted'
}

/**
 * Get the current notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}
