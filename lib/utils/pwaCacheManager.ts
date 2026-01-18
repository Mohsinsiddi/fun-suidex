// ============================================
// PWA Cache Manager
// ============================================
// Centralized cache clearing for PWA pages
// Called on logout to prevent stale data

type CacheClearFn = () => void

// Registry of cache clear functions
const cacheClearFunctions: CacheClearFn[] = []

// Register a cache clear function
export function registerCacheClear(fn: CacheClearFn) {
  if (!cacheClearFunctions.includes(fn)) {
    cacheClearFunctions.push(fn)
  }
}

// Clear all registered caches
export function clearAllPWACaches() {
  cacheClearFunctions.forEach(fn => {
    try {
      fn()
    } catch (e) {
      console.error('Error clearing cache:', e)
    }
  })
}
