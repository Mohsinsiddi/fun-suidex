# Zustand Stores Implementation Plan

## Problem
Every page makes duplicate API calls due to:
1. React Strict Mode (development) causing double renders
2. No centralized state management - each page fetches its own data
3. Existing `authStore.ts` is underutilized (only 1 component uses it while 7+ pages implement their own fetch logic)

## Solution
Create Zustand stores with **"load once, access everywhere"** pattern. Data is fetched once and cached in memory, accessible from any component without re-fetching.

---

## Store Architecture

### User Stores (4 stores)

| Store | File | Data | Cache Duration |
|-------|------|------|----------------|
| `useAuthStore` | `lib/stores/authStore.ts` | wallet, spins, stats, profile | Session + refresh after mutations |
| `useConfigStore` | `lib/stores/configStore.ts` | prizeTable, spinRate, settings | 1 hour (static) |
| `useBadgesStore` | `lib/stores/badgesStore.ts` | allBadges, userBadges, progress | 10 min |
| `useReferralStore` | `lib/stores/referralStore.ts` | link, stats, earnings | 5 min |

### Admin Stores (4 stores)

| Store | File | Data | Cache Duration |
|-------|------|------|----------------|
| `useAdminAuthStore` | `lib/stores/admin/adminAuthStore.ts` | isAuthenticated, admin info | Session |
| `useAdminStatsStore` | `lib/stores/admin/adminStatsStore.ts` | dashboard stats | 30 sec |
| `useAdminConfigStore` | `lib/stores/admin/adminConfigStore.ts` | config with mutations | 5 min |
| `createPaginatedStore` | `lib/stores/admin/createPaginatedStore.ts` | Generic factory for lists | No cache (pagination) |

---

## Implementation Phases

### Phase 1: Core User Stores

#### 1.1 Enhance `useAuthStore` (lib/stores/authStore.ts)

**Current state:** Basic auth only
**New state shape:**

```typescript
interface AuthState {
  // Auth
  isAuthenticated: boolean
  isLoading: boolean
  wallet: string | null
  error: string | null

  // Spins (refreshed after mutations)
  freeSpins: number
  purchasedSpins: number
  bonusSpins: number

  // Profile
  profile: {
    displayName: string | null
    bio: string | null
    isPublic: boolean
    slug: string | null
    featuredBadges: string[]
  } | null
  profileEligible: boolean

  // Stats
  stats: {
    totalSpins: number
    totalWinsUSD: number
    biggestWinUSD: number
    currentStreak: number
    longestStreak: number
    totalReferred: number
    memberSince: string | null
  }

  // Referral
  referralCode: string | null
  referredBy: string | null
  hasCompletedFirstSpin: boolean

  // Cache tracking
  lastFetched: number | null

  // Actions
  fetchUser: () => Promise<boolean>
  refreshSpins: () => Promise<void>
  updateProfile: (data: Partial<ProfileData>) => void
  login: (wallet: string, signature: string, nonce: string, referrer?: string) => Promise<boolean>
  logout: () => Promise<void>
  reset: () => void
  clearError: () => void
}
```

#### 1.2 Create `useConfigStore` (lib/stores/configStore.ts)

```typescript
interface ConfigState {
  isLoaded: boolean
  isLoading: boolean
  error: string | null

  prizeTable: PrizeSlot[]
  spinRateSUI: number
  adminWalletAddress: string
  spinPurchaseEnabled: boolean
  referralEnabled: boolean
  referralCommissionPercent: number
  freeSpinMinStakeUSD: number

  lastFetched: number | null

  fetchConfig: () => Promise<void>
  invalidate: () => void
}
```

---

### Phase 2: Secondary User Stores

#### 2.1 Create `useBadgesStore` (lib/stores/badgesStore.ts)

```typescript
interface BadgesState {
  allBadges: Badge[]
  userBadges: UserBadge[]
  badgeProgress: BadgeProgress[]
  badgeStats: { total: number; byTier: Record<string, number> }

  isLoadingAll: boolean
  isLoadingUser: boolean
  lastFetchedAll: number | null
  lastFetchedUser: number | null

  fetchAllBadges: () => Promise<void>
  fetchUserBadges: () => Promise<void>
  invalidate: () => void
}
```

#### 2.2 Create `useReferralStore` (lib/stores/referralStore.ts)

```typescript
interface ReferralState {
  referralLink: string | null
  eligible: boolean
  stats: { totalReferred: number; totalEarningsUSD: number; pendingTweets: number; readyForPayout: number } | null

  earnings: ReferralEarning[]
  earningsPage: number
  earningsTotalPages: number

  isLoadingLink: boolean
  isLoadingStats: boolean
  isLoadingEarnings: boolean

  fetchReferralLink: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchEarnings: (page?: number, filter?: string) => Promise<void>
  invalidateStats: () => void
}
```

---

### Phase 3: Admin Stores

#### 3.1 Create `useAdminAuthStore` (lib/stores/admin/adminAuthStore.ts)

```typescript
interface AdminAuthState {
  isAuthenticated: boolean
  isLoading: boolean
  admin: { username: string; role: string; permissions: string[] } | null
  error: string | null

  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
}
```

#### 3.2 Create `useAdminStatsStore` (lib/stores/admin/adminStatsStore.ts)

```typescript
interface AdminStatsState {
  stats: DashboardStats | null
  isLoading: boolean
  lastFetched: number | null

  fetchStats: () => Promise<void>
  invalidate: () => void
}
```

#### 3.3 Create `useAdminConfigStore` (lib/stores/admin/adminConfigStore.ts)

Same as user configStore but with mutation actions (updateConfig).

#### 3.4 Create `createPaginatedStore` factory (lib/stores/admin/createPaginatedStore.ts)

```typescript
function createPaginatedStore<T>(endpoint: string) {
  return create<PaginatedState<T>>((set, get) => ({
    items: [],
    page: 1,
    totalPages: 0,
    total: 0,
    isLoading: false,
    filters: {},

    fetch: async (page?: number, filters?: Record<string, string>) => { ... },
    setPage: (page: number) => { ... },
    setFilters: (filters: Record<string, string>) => { ... },
    updateItem: (id: string, updates: Partial<T>) => { ... },
    removeItem: (id: string) => { ... },
  }))
}

// Usage - create individual stores:
export const useDistributeStore = createPaginatedStore<PendingPrize>('/api/admin/distribute')
export const useUsersStore = createPaginatedStore<AdminUser>('/api/admin/users')
export const useAffiliatesStore = createPaginatedStore<AffiliateReward>('/api/admin/affiliates')
export const useRevenueStore = createPaginatedStore<Payment>('/api/admin/revenue')
```

---

## Files to Create (8 new files)

```
lib/stores/
├── authStore.ts        # MODIFY (enhance existing)
├── configStore.ts      # CREATE
├── badgesStore.ts      # CREATE
├── referralStore.ts    # CREATE
└── admin/
    ├── adminAuthStore.ts       # CREATE
    ├── adminStatsStore.ts      # CREATE
    ├── adminConfigStore.ts     # CREATE
    └── createPaginatedStore.ts # CREATE
```

---

## Files to Modify (Pages using stores)

### User Pages (7 files)

| File | Stores to Use |
|------|---------------|
| `app/page.tsx` | useAuthStore |
| `app/wheel/page.tsx` | useAuthStore, useConfigStore |
| `app/profile/page.tsx` | useAuthStore, useBadgesStore |
| `app/referral/page.tsx` | useAuthStore, useReferralStore |
| `app/badges/page.tsx` | useBadgesStore |
| `app/leaderboard/page.tsx` | Keep as-is (pagination) |
| `app/u/[slug]/page.tsx` | Keep as-is (dynamic route) |

### User Components (4 files)

| File | Stores to Use |
|------|---------------|
| `components/wheel/BuySpinsModal.tsx` | useConfigStore |
| `components/referral/ReferralStats.tsx` | useReferralStore |
| `components/referral/ReferralEarningsTable.tsx` | useReferralStore |
| `components/activity/UserSpinHistory.tsx` | Keep as-is (pagination) |

### Admin Pages (7 files)

| File | Stores to Use |
|------|---------------|
| `app/admin/(auth)/login/page.tsx` | useAdminAuthStore |
| `app/admin/(dashboard)/dashboard/page.tsx` | useAdminStatsStore |
| `app/admin/(dashboard)/config/page.tsx` | useAdminConfigStore |
| `app/admin/(dashboard)/distribute/page.tsx` | useDistributeStore |
| `app/admin/(dashboard)/users/page.tsx` | useUsersStore |
| `app/admin/(dashboard)/revenue/page.tsx` | useRevenueStore |
| `app/admin/(dashboard)/affiliates/page.tsx` | useAffiliatesStore |

---

## Store Usage Pattern

```typescript
// Example: In any component - data loads once, accessed everywhere
function WheelPage() {
  const { isAuthenticated, freeSpins, purchasedSpins, fetchUser } = useAuthStore()
  const { prizeTable, isLoaded, fetchConfig } = useConfigStore()

  // Load on mount (only fetches if not already loaded)
  useEffect(() => {
    if (!isLoaded) fetchConfig()
    if (account?.address) fetchUser()
  }, [account?.address])

  // Data available immediately if already loaded from another page
  return <Wheel slots={prizeTable} spins={freeSpins + purchasedSpins} />
}
```

---

## Mutation Invalidation

When user performs actions, refresh relevant store data:

| Action | Store Method to Call |
|--------|----------------------|
| Spin executed | `authStore.refreshSpins()` |
| Spins purchased | `authStore.refreshSpins()` |
| Profile saved | `authStore.fetchUser()` |
| Badge unlocked | `badgesStore.fetchUserBadges()` |
| Config changed (admin) | `configStore.invalidate()` |

---

## Implementation Order

1. **Phase 1A:** Create enhanced `authStore.ts`
2. **Phase 1B:** Create `configStore.ts`
3. **Phase 1C:** Update `app/wheel/page.tsx` to use both stores
4. **Phase 1D:** Update remaining user pages
5. **Phase 2A:** Create `badgesStore.ts`
6. **Phase 2B:** Create `referralStore.ts`
7. **Phase 2C:** Update badges and referral pages/components
8. **Phase 3A:** Create `lib/stores/admin/` directory
9. **Phase 3B:** Create `adminAuthStore.ts`
10. **Phase 3C:** Create `adminStatsStore.ts`
11. **Phase 3D:** Create `adminConfigStore.ts`
12. **Phase 3E:** Create `createPaginatedStore.ts`
13. **Phase 3F:** Update admin pages

---

## Verification Checklist

- [ ] Open Network tab in browser DevTools
- [ ] Navigate between pages (wheel → profile → referral → wheel)
- [ ] Verify `/api/auth/me` called only ONCE (not per page)
- [ ] Verify `/api/config` called only ONCE
- [ ] Execute a spin, verify spin counts update across all pages
- [ ] Keep React Strict Mode enabled, verify no duplicate calls

---

## Progress Tracker

- [x] Phase 1A: authStore.ts - COMPLETED
- [x] Phase 1B: configStore.ts - COMPLETED
- [x] Phase 2A: badgesStore.ts - COMPLETED
- [x] Phase 2B: referralStore.ts - COMPLETED
- [x] Phase 3: admin stores - COMPLETED
  - [x] adminAuthStore.ts
  - [x] adminStatsStore.ts
  - [x] adminConfigStore.ts
  - [x] createPaginatedStore.ts (with useDistributeStore, useUsersStore, useAffiliatesStore, useRevenueStore)
  - [x] index.ts (exports)
- [x] lib/stores/index.ts (central exports)
- [x] Phase 4: Update user pages - COMPLETED
  - [x] app/page.tsx - Updated to use useAuthStore
  - [x] app/wheel/page.tsx - Updated to use useAuthStore + useConfigStore
  - [x] app/profile/page.tsx - Updated to use useAuthStore + useBadgesStore
  - [x] app/referral/page.tsx - Updated to use useAuthStore + useReferralStore
  - [x] app/badges/page.tsx - Updated to use useBadgesStore
- [x] Phase 5: Update components/admin pages - COMPLETED
  - [x] components/referral/ReferralStats.tsx - Updated to use useReferralStore
  - [x] components/referral/ReferralEarningsTable.tsx - Updated to use useReferralStore
  - [x] app/admin/(dashboard)/distribute/page.tsx - Updated to use useDistributeStore
  - [x] app/admin/(dashboard)/dashboard/page.tsx - Updated to use useAdminStatsStore
  - [x] app/admin/(auth)/login/page.tsx - Updated to use useAdminAuthStore
  - [x] app/admin/(dashboard)/config/page.tsx - Updated to use useAdminConfigStore
  - [x] app/admin/(dashboard)/users/page.tsx - Updated to use useUsersStore
  - [x] app/admin/(dashboard)/revenue/page.tsx - Kept local state (combined stats+payments API)
  - [x] app/admin/(dashboard)/affiliates/page.tsx - Kept local state (bulk selection + combined API)
- [ ] Testing complete

---

## Files Created

```
lib/stores/
├── index.ts              ✅ Created
├── authStore.ts          ✅ Enhanced
├── configStore.ts        ✅ Created
├── badgesStore.ts        ✅ Created
├── referralStore.ts      ✅ Created
└── admin/
    ├── index.ts              ✅ Created
    ├── adminAuthStore.ts     ✅ Created
    ├── adminStatsStore.ts    ✅ Created
    ├── adminConfigStore.ts   ✅ Created
    └── createPaginatedStore.ts ✅ Created
```

---

## Next Steps

### Phase 4: Update User Pages

Update these files to use the new stores:

1. `app/page.tsx` - Replace local auth state with useAuthStore
2. `app/wheel/page.tsx` - Use useAuthStore + useConfigStore
3. `app/profile/page.tsx` - Use useAuthStore + useBadgesStore
4. `app/referral/page.tsx` - Use useAuthStore + useReferralStore
5. `app/badges/page.tsx` - Use useBadgesStore
6. `components/wheel/BuySpinsModal.tsx` - Use useConfigStore
7. `components/referral/ReferralStats.tsx` - Use useReferralStore
8. `components/referral/ReferralEarningsTable.tsx` - Use useReferralStore

### Phase 5: Update Admin Pages

1. `app/admin/(auth)/login/page.tsx` - Use useAdminAuthStore
2. `app/admin/(dashboard)/dashboard/page.tsx` - Use useAdminStatsStore
3. `app/admin/(dashboard)/config/page.tsx` - Use useAdminConfigStore
4. `app/admin/(dashboard)/distribute/page.tsx` - Use useDistributeStore
5. `app/admin/(dashboard)/users/page.tsx` - Use useUsersStore
6. `app/admin/(dashboard)/revenue/page.tsx` - Use useRevenueStore
7. `app/admin/(dashboard)/affiliates/page.tsx` - Use useAffiliatesStore
