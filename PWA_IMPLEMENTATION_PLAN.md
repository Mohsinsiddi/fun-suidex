# PWA Implementation Plan - SuiDex Games

## Overview

Add Progressive Web App (PWA) with derived wallet for users who complete 25 spins. Users can play the full game from their phone with push notifications for reward payments.

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [New API Endpoints](#2-new-api-endpoints)
3. [Updated API Endpoints](#3-updated-api-endpoints)
4. [New Files](#4-new-files)
5. [Updated Files](#5-updated-files)
6. [PWA Assets](#6-pwa-assets)
7. [Implementation Phases](#7-implementation-phases)

---

## 1. Database Schema

### 1.1 NEW: PWAWallet Model

**File:** `lib/db/models/PWAWallet.ts`

```typescript
interface PWAWallet {
  // Identifiers
  trackerId: string           // "VIC-X7K9M2" - public, used in URL

  // Wallet Links
  mainWallet: string          // User's main wallet (extension)
  pwaWallet: string           // Derived wallet address

  // Derivation (for recovery)
  derivationMessage: string   // Message that was signed
  derivationTimestamp: number // Timestamp in message

  // Security
  pinHash: string             // bcrypt(pin + salt)
  pinSalt: string             // Random salt
  pinAttempts: number         // Failed attempts (max 5)
  lockedUntil: Date | null    // Lock after 5 failures

  // Encrypted Key Storage
  encryptedPrivateKey: string // AES-256 encrypted with PIN
  keyIv: string               // IV for decryption

  // Push Notifications
  pushSubscriptions: [{
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
    deviceName: string
    createdAt: Date
  }]
  notifyOnPayment: boolean    // Default: true
  notifyOnReferral: boolean   // Default: true
  notifyDaily: boolean        // Default: false

  // Metadata
  createdAt: Date
  lastAccessedAt: Date
  accessCount: number
  devices: string[]           // Device fingerprints

  // Status
  isActive: boolean           // Can be revoked
  revokedAt: Date | null
  revokedReason: string | null
}

// Indexes
- trackerId: unique
- mainWallet: unique (one PWA per main wallet)
- pwaWallet: unique
- 'pushSubscriptions.endpoint': 1
```

### 1.2 UPDATE: User Model

**File:** `lib/db/models/User.ts`

```typescript
// Add new fields
{
  // PWA
  pwaUnlockedAt: Date | null      // When PWA was unlocked
  pwaTrackerId: string | null     // Reference to PWAWallet.trackerId

  // Existing fields remain unchanged
}
```

### 1.3 UPDATE: Spin Model

**File:** `lib/db/models/Spin.ts`

```typescript
// Add new fields
{
  // Notification tracking
  paymentNotifiedAt: Date | null  // When push was sent
  notificationStatus: 'pending' | 'sent' | 'failed' | null

  // Existing fields remain unchanged
}
```

### 1.4 NEW: PushNotification Model (Optional - for logging)

**File:** `lib/db/models/PushNotification.ts`

```typescript
interface PushNotification {
  wallet: string
  trackerId: string
  type: 'payment' | 'referral' | 'daily' | 'custom'
  title: string
  body: string
  data: object
  status: 'sent' | 'failed' | 'clicked'
  sentAt: Date
  clickedAt: Date | null
  errorMessage: string | null
}
```

---

## 2. New API Endpoints

### 2.1 PWA Wallet Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pwa/status` | Check if user can unlock PWA (25+ spins) |
| `POST` | `/api/pwa/generate` | Generate derived wallet from signature |
| `POST` | `/api/pwa/verify-pin` | Verify PIN and return session token |
| `POST` | `/api/pwa/recover` | Recover PWA wallet (re-sign from main) |
| `POST` | `/api/pwa/revoke` | Revoke PWA wallet access |
| `PUT` | `/api/pwa/pin` | Change PIN |
| `GET` | `/api/pwa/export-key` | Export private key (requires PIN) |

#### `/api/pwa/status` (GET)
```typescript
// Request: Cookie auth (main wallet)
// Response:
{
  success: true,
  data: {
    eligible: boolean,        // totalSpins >= 25
    totalSpins: number,
    spinsRequired: 25,
    hasExistingPWA: boolean,
    trackerId: string | null  // If already has PWA
  }
}
```

#### `/api/pwa/generate` (POST)
```typescript
// Request:
{
  signature: string,     // Signed message from main wallet
  message: string,       // "SuiDex PWA:0x...:timestamp"
  pin: string           // 4-6 digit PIN
}
// Response:
{
  success: true,
  data: {
    trackerId: "VIC-X7K9M2",
    pwaWallet: "0x7b2...",
    qrCodeUrl: "suidex.games/pwa/app/VIC-X7K9M2",
    installInstructions: {...}
  }
}
```

### 2.2 PWA Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pwa/auth/verify` | Verify PWA wallet signature |
| `POST` | `/api/pwa/auth/session` | Create session from PIN |
| `POST` | `/api/pwa/auth/refresh` | Refresh PWA session |
| `POST` | `/api/pwa/auth/logout` | Logout PWA session |

#### `/api/pwa/auth/verify` (POST)
```typescript
// Request:
{
  trackerId: string,
  signature: string,     // Signed by PWA wallet
  message: string,       // Nonce message
  timestamp: number
}
// Response:
{
  success: true,
  data: {
    sessionToken: string,  // Short-lived JWT for PWA
    expiresAt: number,
    wallet: string,        // Main wallet address
    pwaWallet: string
  }
}
```

### 2.3 PWA Game Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pwa/spin` | Execute spin (PWA auth) |
| `GET` | `/api/pwa/spin/eligibility` | Check spin eligibility |
| `GET` | `/api/pwa/rewards` | Get pending/paid rewards |
| `GET` | `/api/pwa/rewards/[spinId]` | Get single reward details |
| `GET` | `/api/pwa/profile` | Get user profile for PWA |
| `GET` | `/api/pwa/referral` | Get referral data |
| `GET` | `/api/pwa/history` | Get spin history |

#### `/api/pwa/spin` (POST)
```typescript
// Request Headers:
Authorization: Bearer <pwa_session_token>
X-PWA-Tracker: VIC-X7K9M2

// Response: Same as /api/spin
```

### 2.4 PWA Payment (Buy Spins)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pwa/payment/info` | Get payment address & rate |
| `POST` | `/api/pwa/payment/claim` | Claim TX (validates main wallet as sender) |
| `GET` | `/api/pwa/payment/scan` | Scan for unclaimed TXs from main wallet |

#### `/api/pwa/payment/claim` (POST)
```typescript
// Request:
{
  txHash: string
}
// Server validates:
// 1. TX sender === PWA's linked main wallet
// 2. TX recipient === admin wallet
// 3. TX not already claimed
// 4. TX within lookback period
```

### 2.5 Push Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pwa/push/vapid-key` | Get VAPID public key |
| `POST` | `/api/pwa/push/subscribe` | Subscribe to push notifications |
| `DELETE` | `/api/pwa/push/subscribe` | Unsubscribe |
| `PUT` | `/api/pwa/push/settings` | Update notification preferences |
| `POST` | `/api/pwa/push/test` | Send test notification |

#### `/api/pwa/push/subscribe` (POST)
```typescript
// Request:
{
  subscription: {
    endpoint: string,
    keys: {
      p256dh: string,
      auth: string
    }
  },
  deviceName: string  // "iPhone 15", "Chrome Desktop"
}
```

---

## 3. Updated API Endpoints

### 3.1 Admin Distribute (Trigger Push)

**File:** `app/api/admin/distribute/route.ts`

```typescript
// After marking spin as distributed:
// ADD: Send push notification to user
await sendPaymentNotification(spin.wallet, {
  spinId: spin._id,
  amount: spin.prizeValueUSD,
  prizeType: spin.prizeType,
  txHash: txHash
})
```

### 3.2 Spin API (Dual Auth)

**File:** `app/api/spin/route.ts`

```typescript
// UPDATE: Support both cookie auth AND PWA signature auth
// Try cookie first (main app), then PWA token
```

### 3.3 Auth Verify (Signature Security Fix)

**File:** `app/api/auth/verify/route.ts`

```typescript
// FIX: Add server-side signature verification
// Currently only checks signature.length >= 10
// ADD: Use @mysten/sui verifyPersonalMessageSignature()
```

### 3.4 Affiliate Pay (Trigger Push)

**File:** `app/api/admin/affiliates/pay/route.ts`

```typescript
// After marking affiliate reward as paid:
// ADD: Send push notification
await sendReferralNotification(referrerWallet, {
  amount: reward.rewardAmountVICT,
  fromWallet: reward.refereeWallet
})
```

---

## 4. New Files

### 4.1 Database Models

| File | Description |
|------|-------------|
| `lib/db/models/PWAWallet.ts` | PWA wallet link model |
| `lib/db/models/PushNotification.ts` | Push notification log model |

### 4.2 PWA Utilities

| File | Description |
|------|-------------|
| `lib/pwa/deriveWallet.ts` | Derive wallet from signature |
| `lib/pwa/verifyPWAAuth.ts` | Verify PWA wallet signatures |
| `lib/pwa/encryptKey.ts` | Encrypt/decrypt private key with PIN |
| `lib/pwa/generateTrackerId.ts` | Generate unique tracker IDs |

### 4.3 Push Notification Utilities

| File | Description |
|------|-------------|
| `lib/push/webPush.ts` | Web Push setup & send |
| `lib/push/notifications.ts` | Notification templates |
| `lib/push/sendPaymentNotification.ts` | Send payment alert |
| `lib/push/sendReferralNotification.ts` | Send referral alert |

### 4.4 API Routes - PWA Wallet

| File | Description |
|------|-------------|
| `app/api/pwa/status/route.ts` | Check PWA eligibility |
| `app/api/pwa/generate/route.ts` | Generate PWA wallet |
| `app/api/pwa/verify-pin/route.ts` | Verify PIN |
| `app/api/pwa/recover/route.ts` | Recover wallet |
| `app/api/pwa/revoke/route.ts` | Revoke access |
| `app/api/pwa/pin/route.ts` | Change PIN |
| `app/api/pwa/export-key/route.ts` | Export private key |

### 4.5 API Routes - PWA Auth

| File | Description |
|------|-------------|
| `app/api/pwa/auth/verify/route.ts` | Verify PWA signature |
| `app/api/pwa/auth/session/route.ts` | Create session |
| `app/api/pwa/auth/refresh/route.ts` | Refresh session |
| `app/api/pwa/auth/logout/route.ts` | Logout |

### 4.6 API Routes - PWA Game

| File | Description |
|------|-------------|
| `app/api/pwa/spin/route.ts` | PWA spin |
| `app/api/pwa/spin/eligibility/route.ts` | Check eligibility |
| `app/api/pwa/rewards/route.ts` | Get rewards |
| `app/api/pwa/rewards/[spinId]/route.ts` | Single reward |
| `app/api/pwa/profile/route.ts` | Get profile |
| `app/api/pwa/referral/route.ts` | Get referral |
| `app/api/pwa/history/route.ts` | Spin history |

### 4.7 API Routes - PWA Payment

| File | Description |
|------|-------------|
| `app/api/pwa/payment/info/route.ts` | Payment info |
| `app/api/pwa/payment/claim/route.ts` | Claim TX |
| `app/api/pwa/payment/scan/route.ts` | Scan TXs |

### 4.8 API Routes - Push

| File | Description |
|------|-------------|
| `app/api/pwa/push/vapid-key/route.ts` | Get VAPID key |
| `app/api/pwa/push/subscribe/route.ts` | Subscribe/unsubscribe |
| `app/api/pwa/push/settings/route.ts` | Update settings |
| `app/api/pwa/push/test/route.ts` | Test notification |

### 4.9 PWA Pages

| File | Description |
|------|-------------|
| `app/pwa/page.tsx` | PWA landing (public) |
| `app/pwa/unlock/page.tsx` | Unlock PWA (needs main app auth) |
| `app/pwa/app/[trackerId]/page.tsx` | PWA main (redirects to wheel) |
| `app/pwa/app/[trackerId]/wheel/page.tsx` | PWA wheel game |
| `app/pwa/app/[trackerId]/rewards/page.tsx` | PWA rewards |
| `app/pwa/app/[trackerId]/buy/page.tsx` | PWA buy spins |
| `app/pwa/app/[trackerId]/profile/page.tsx` | PWA profile |
| `app/pwa/app/[trackerId]/referral/page.tsx` | PWA referral |
| `app/pwa/app/[trackerId]/history/page.tsx` | PWA history |
| `app/pwa/app/[trackerId]/settings/page.tsx` | PWA settings |
| `app/pwa/app/[trackerId]/layout.tsx` | PWA app layout |
| `app/pwa/recover/page.tsx` | Recover PWA wallet |

### 4.10 PWA Components

| File | Description |
|------|-------------|
| `components/pwa/PWAInstallPrompt.tsx` | Add to home screen prompt |
| `components/pwa/PWAUnlockModal.tsx` | Unlock flow modal |
| `components/pwa/PWAPinInput.tsx` | PIN entry component |
| `components/pwa/PWABottomNav.tsx` | Mobile bottom navigation |
| `components/pwa/PWAHeader.tsx` | Minimal PWA header |
| `components/pwa/PWARewardCard.tsx` | Reward display card |
| `components/pwa/PWAWheelCompact.tsx` | Mobile-optimized wheel |
| `components/pwa/PWANotificationToggle.tsx` | Push settings toggle |
| `components/pwa/PWAOfflineIndicator.tsx` | Offline status |

### 4.11 PWA Stores

| File | Description |
|------|-------------|
| `lib/stores/pwaAuthStore.ts` | PWA auth state |
| `lib/stores/pwaStore.ts` | PWA wallet & settings |

### 4.12 Service Worker & Manifest

| File | Description |
|------|-------------|
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Service worker |
| `app/pwa/sw-register.tsx` | SW registration component |

---

## 5. Updated Files

### 5.1 Database

| File | Changes |
|------|---------|
| `lib/db/models/index.ts` | Export PWAWallet, PushNotification |
| `lib/db/models/User.ts` | Add pwaUnlockedAt, pwaTrackerId fields |
| `lib/db/models/Spin.ts` | Add paymentNotifiedAt, notificationStatus |

### 5.2 API Routes

| File | Changes |
|------|---------|
| `app/api/spin/route.ts` | Add PWA auth support (dual auth) |
| `app/api/admin/distribute/route.ts` | Trigger push notification |
| `app/api/admin/affiliates/pay/route.ts` | Trigger push notification |
| `app/api/auth/verify/route.ts` | Fix signature verification |

### 5.3 Auth Utilities

| File | Changes |
|------|---------|
| `lib/auth/withAuth.ts` | Add withPWAAuth wrapper |
| `lib/auth/jwt.ts` | Add PWA session token functions |

### 5.4 Validation

| File | Changes |
|------|---------|
| `lib/validations/index.ts` | Add PWA validation schemas |

### 5.5 Layout & Config

| File | Changes |
|------|---------|
| `app/layout.tsx` | Add PWA meta tags, manifest link |
| `next.config.js` | Add PWA headers if needed |

### 5.6 Profile Page (Unlock UI)

| File | Changes |
|------|---------|
| `app/profile/page.tsx` | Add PWA unlock section |

### 5.7 Types

| File | Changes |
|------|---------|
| `types/index.ts` | Add PWA types |

---

## 6. PWA Assets

### 6.1 Icons (public/icons/)

| File | Size | Purpose |
|------|------|---------|
| `icon-72x72.png` | 72x72 | Android |
| `icon-96x96.png` | 96x96 | Android |
| `icon-128x128.png` | 128x128 | Android |
| `icon-144x144.png` | 144x144 | Android |
| `icon-152x152.png` | 152x152 | iOS |
| `icon-192x192.png` | 192x192 | Android/Chrome |
| `icon-384x384.png` | 384x384 | Android |
| `icon-512x512.png` | 512x512 | Android splash |
| `apple-touch-icon.png` | 180x180 | iOS home screen |
| `maskable-icon.png` | 512x512 | Maskable icon |

### 6.2 Manifest (public/manifest.json)

```json
{
  "name": "SuiDex Games",
  "short_name": "SuiDex",
  "description": "Spin to win Victory tokens!",
  "start_url": "/pwa",
  "display": "standalone",
  "background_color": "#050609",
  "theme_color": "#00e5ff",
  "orientation": "portrait",
  "icons": [...],
  "categories": ["games", "finance"]
}
```

### 6.3 Service Worker (public/sw.js)

```javascript
// Cache strategies:
// - Static assets: Cache first
// - API calls: Network first, cache fallback
// - Push notification handling
// - Offline page
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Priority: Critical)

**Goal:** PWA infrastructure without game features

| Task | Files | Effort |
|------|-------|--------|
| Create PWAWallet model | `lib/db/models/PWAWallet.ts` | Small |
| Update User model | `lib/db/models/User.ts` | Small |
| Update model exports | `lib/db/models/index.ts` | Small |
| Create manifest.json | `public/manifest.json` | Small |
| Create icons | `public/icons/*` | Medium |
| Create service worker | `public/sw.js` | Medium |
| Update layout with PWA meta | `app/layout.tsx` | Small |
| PWA landing page | `app/pwa/page.tsx` | Small |

### Phase 2: Wallet Generation (Priority: Critical)

**Goal:** Users can generate and manage PWA wallets

| Task | Files | Effort |
|------|-------|--------|
| Derive wallet utility | `lib/pwa/deriveWallet.ts` | Medium |
| Encrypt key utility | `lib/pwa/encryptKey.ts` | Medium |
| Generate tracker ID | `lib/pwa/generateTrackerId.ts` | Small |
| PWA status API | `app/api/pwa/status/route.ts` | Small |
| PWA generate API | `app/api/pwa/generate/route.ts` | Large |
| PWA verify-pin API | `app/api/pwa/verify-pin/route.ts` | Medium |
| PWA recover API | `app/api/pwa/recover/route.ts` | Medium |
| PWA revoke API | `app/api/pwa/revoke/route.ts` | Small |
| PWA change PIN API | `app/api/pwa/pin/route.ts` | Small |
| PWA export key API | `app/api/pwa/export-key/route.ts` | Small |
| Unlock page UI | `app/pwa/unlock/page.tsx` | Large |
| Add unlock to profile | `app/profile/page.tsx` | Medium |
| PWA validation schemas | `lib/validations/index.ts` | Small |

### Phase 3: PWA Authentication (Priority: Critical)

**Goal:** PWA can authenticate and maintain sessions

| Task | Files | Effort |
|------|-------|--------|
| PWA verify signature | `lib/pwa/verifyPWAAuth.ts` | Medium |
| PWA JWT functions | `lib/auth/jwt.ts` | Small |
| withPWAAuth wrapper | `lib/auth/withAuth.ts` | Medium |
| PWA auth verify API | `app/api/pwa/auth/verify/route.ts` | Medium |
| PWA auth session API | `app/api/pwa/auth/session/route.ts` | Medium |
| PWA auth refresh API | `app/api/pwa/auth/refresh/route.ts` | Small |
| PWA auth logout API | `app/api/pwa/auth/logout/route.ts` | Small |
| PWA auth store | `lib/stores/pwaAuthStore.ts` | Medium |

### Phase 4: PWA Game Features (Priority: High)

**Goal:** Users can play from PWA

| Task | Files | Effort |
|------|-------|--------|
| PWA spin API | `app/api/pwa/spin/route.ts` | Medium |
| PWA eligibility API | `app/api/pwa/spin/eligibility/route.ts` | Small |
| PWA rewards API | `app/api/pwa/rewards/route.ts` | Medium |
| PWA profile API | `app/api/pwa/profile/route.ts` | Small |
| PWA referral API | `app/api/pwa/referral/route.ts` | Small |
| PWA history API | `app/api/pwa/history/route.ts` | Small |
| Update main spin API | `app/api/spin/route.ts` | Medium |
| PWA app layout | `app/pwa/app/[trackerId]/layout.tsx` | Medium |
| PWA wheel page | `app/pwa/app/[trackerId]/wheel/page.tsx` | Large |
| PWA rewards page | `app/pwa/app/[trackerId]/rewards/page.tsx` | Medium |
| PWA profile page | `app/pwa/app/[trackerId]/profile/page.tsx` | Medium |
| PWA referral page | `app/pwa/app/[trackerId]/referral/page.tsx` | Medium |
| PWA history page | `app/pwa/app/[trackerId]/history/page.tsx` | Medium |
| PWA settings page | `app/pwa/app/[trackerId]/settings/page.tsx` | Medium |
| PWA components | `components/pwa/*` | Large |

### Phase 5: PWA Payments (Priority: High)

**Goal:** Users can buy spins from PWA

| Task | Files | Effort |
|------|-------|--------|
| PWA payment info API | `app/api/pwa/payment/info/route.ts` | Small |
| PWA payment claim API | `app/api/pwa/payment/claim/route.ts` | Medium |
| PWA payment scan API | `app/api/pwa/payment/scan/route.ts` | Medium |
| PWA buy page | `app/pwa/app/[trackerId]/buy/page.tsx` | Medium |

### Phase 6: Push Notifications (Priority: Medium)

**Goal:** Users receive push notifications

| Task | Files | Effort |
|------|-------|--------|
| Web Push setup | `lib/push/webPush.ts` | Medium |
| Notification templates | `lib/push/notifications.ts` | Small |
| Payment notification | `lib/push/sendPaymentNotification.ts` | Small |
| Referral notification | `lib/push/sendReferralNotification.ts` | Small |
| PushNotification model | `lib/db/models/PushNotification.ts` | Small |
| VAPID key API | `app/api/pwa/push/vapid-key/route.ts` | Small |
| Subscribe API | `app/api/pwa/push/subscribe/route.ts` | Medium |
| Settings API | `app/api/pwa/push/settings/route.ts` | Small |
| Test API | `app/api/pwa/push/test/route.ts` | Small |
| Update Spin model | `lib/db/models/Spin.ts` | Small |
| Update distribute API | `app/api/admin/distribute/route.ts` | Medium |
| Update affiliate pay API | `app/api/admin/affiliates/pay/route.ts` | Medium |
| SW push handling | `public/sw.js` | Medium |

### Phase 7: Security Fixes (Priority: High)

**Goal:** Fix existing security issues

| Task | Files | Effort |
|------|-------|--------|
| Fix signature verification | `app/api/auth/verify/route.ts` | Medium |
| Add nonce validation | `app/api/auth/verify/route.ts` | Small |
| Consume nonce after use | `lib/auth/nonceStore.ts` | Small |

---

## File Count Summary

| Category | New Files | Updated Files |
|----------|-----------|---------------|
| Database Models | 2 | 3 |
| API Routes | 24 | 4 |
| PWA Pages | 12 | 1 |
| Components | 10 | 0 |
| Utilities | 8 | 3 |
| Stores | 2 | 0 |
| Assets | 11 | 0 |
| Config | 2 | 2 |
| **TOTAL** | **71** | **13** |

---

## Environment Variables (New)

```env
# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_EMAIL=mailto:admin@suidex.games

# PWA Session
PWA_SESSION_SECRET=your_pwa_session_secret

# Encryption (for private key storage)
PWA_ENCRYPTION_KEY=32_byte_hex_key
```

---

## Dependencies (New)

```json
{
  "dependencies": {
    "web-push": "^3.6.7",        // Push notifications
    "@noble/ed25519": "^2.0.0"   // Key derivation (if not using @mysten/sui)
  }
}
```

---

## Testing Checklist

### PWA Wallet
- [ ] Generate wallet from signature (deterministic)
- [ ] Same signature = same wallet (recovery works)
- [ ] PIN encryption/decryption works
- [ ] PIN lockout after 5 failures
- [ ] Revoke access works

### PWA Game
- [ ] Spin works with PWA auth
- [ ] Spins deducted correctly
- [ ] Rewards display correctly
- [ ] Profile shows correct stats

### PWA Payments
- [ ] Can claim TX from main wallet
- [ ] Rejects TX from other wallets
- [ ] Spins credited correctly

### Push Notifications
- [ ] Subscribe works
- [ ] Payment notification received
- [ ] Referral notification received
- [ ] Notification clicks open app

### Security
- [ ] PWA can't impersonate other users
- [ ] PIN required for sensitive operations
- [ ] Session expires correctly
- [ ] Can't double-claim payments

---

## Approval Required

Please review this plan and confirm:

1. Database schema looks correct?
2. API structure makes sense?
3. Page structure is good?
4. Any features to add/remove?
5. Priority order is acceptable?

Once approved, I'll start with Phase 1 (Foundation).
