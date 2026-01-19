# 🎡 SuiDex Games - Technical Documentation

> **Project:** Wheel of Victory  
> **Domain:** fun.suidex.org  
> **Stack:** Next.js 14 + TypeScript + MongoDB Atlas + Sui Blockchain  
> **Last Updated:** January 2026

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Folder Structure](#folder-structure)
4. [MongoDB Collections](#mongodb-collections)
5. [API Endpoints](#api-endpoints)
6. [User Flows](#user-flows)
7. [Build Status](#build-status)
8. [Environment Variables](#environment-variables)
9. [CLI Scripts](#cli-scripts)

---

## 🎯 Project Overview

### What is Wheel of Victory?

A gamified rewards system for SuiDex ecosystem where users can:
- **Spin to win** VICT tokens (liquid or locked) and SuiTrump tokens
- **Buy spins** using SUI (1 SUI = 1 spin)
- **Earn free spins** by staking on SuiDex ($20+ USD staked)
- **Referral system** (future: earn 10% of referred user's wins)

### Prize Types

| Type | Description | Lock Period |
|------|-------------|-------------|
| Liquid VICT | Immediately withdrawable | None |
| Locked VICT | Vested tokens | 1W / 3M / 1Y / 3Y |
| SuiTrump | Meme token reward | None |
| No Prize | Empty slot | N/A |

### Revenue Model

- Users buy spins: 1 SUI per spin
- Admin manually credits spins after verifying payment
- Prizes distributed within 48 hours

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        fun.suidex.org                                    │
│                     Next.js 14 Application                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   FRONTEND (React + TypeScript)                                         │
│   ├── /wheel           → Wheel game page                                │
│   ├── /admin/login     → Admin login                                    │
│   ├── /admin/dashboard → Admin dashboard                                │
│   ├── /admin/users     → User management & credit spins                 │
│   ├── /admin/config    → Prize table configuration                      │
│   └── /admin/distribute→ Prize distribution                             │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   API ROUTES (/api)                                                      │
│   ├── /auth/*          → Wallet signature authentication                │
│   ├── /spin/*          → Spin execution & history                       │
│   ├── /payment/*       → Payment claim & scan                           │
│   ├── /config          → Public wheel configuration                     │
│   └── /admin/*         → Admin operations                               │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   EXTERNAL CONNECTIONS                                                   │
│   ├── MongoDB Atlas    → All game data (users, spins, payments)         │
│   ├── Main SuiDex DB   → Check staking eligibility (read-only)          │
│   └── SUI RPC          → Verify payment transactions                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
suidex-games/
│
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 next.config.js
├── 📄 tailwind.config.ts
├── 📄 postcss.config.js
├── 📄 middleware.ts              # Protect admin routes
├── 📄 .env.local
├── 📄 .env.example
│
├── 📁 app/
│   ├── 📄 layout.tsx             # Root layout with providers
│   ├── 📄 page.tsx               # Landing / redirect to /wheel
│   ├── 📄 globals.css            # Global styles + Tailwind
│   │
│   ├── 📁 wheel/
│   │   └── 📄 page.tsx           # 🎡 Main wheel game
│   │
│   ├── 📁 admin/
│   │   ├── 📁 login/
│   │   │   └── 📄 page.tsx       # Admin login page
│   │   ├── 📁 dashboard/
│   │   │   └── 📄 page.tsx       # Dashboard + seed defaults
│   │   ├── 📁 users/
│   │   │   └── 📄 page.tsx       # User list + credit spins
│   │   ├── 📁 config/
│   │   │   └── 📄 page.tsx       # Prize table editor
│   │   ├── 📁 revenue/
│   │   │   └── 📄 page.tsx       # View incoming payments
│   │   └── 📁 distribute/
│   │       └── 📄 page.tsx       # Mark prizes as distributed
│   │
│   └── 📁 api/
│       │
│       ├── 📁 auth/
│       │   ├── 📄 nonce/route.ts     # POST - Get nonce for signature
│       │   ├── 📄 verify/route.ts    # POST - Verify sig & create session
│       │   ├── 📄 refresh/route.ts   # POST - Refresh access token
│       │   ├── 📄 logout/route.ts    # POST - Logout
│       │   └── 📄 me/route.ts        # GET - Current user info
│       │
│       ├── 📁 spin/
│       │   ├── 📄 route.ts           # POST - Execute spin
│       │   ├── 📄 eligibility/route.ts # GET - Check if can spin
│       │   └── 📄 history/route.ts   # GET - User's spin history
│       │
│       ├── 📁 payment/
│       │   ├── 📄 claim/route.ts     # POST - Claim spins from TX
│       │   └── 📄 scan/route.ts      # GET - Scan unclaimed TXs
│       │
│       ├── 📄 config/route.ts        # GET - Public wheel config
│       │
│       └── 📁 admin/
│           ├── 📁 auth/
│           │   ├── 📄 login/route.ts     # POST - Admin login
│           │   ├── 📄 logout/route.ts    # POST - Admin logout
│           │   ├── 📄 me/route.ts        # GET - Current admin
│           │   ├── 📄 invite/route.ts    # POST - Generate invite code
│           │   └── 📄 register/route.ts  # POST - Register with invite
│           │
│           ├── 📄 config/route.ts        # GET/PUT - Full config
│           ├── 📄 seed/route.ts          # POST - Seed defaults
│           ├── 📄 revenue/route.ts       # GET - All incoming TXs
│           │
│           ├── 📁 spins/
│           │   ├── 📄 credit/route.ts    # POST - Manual credit spins
│           │   └── 📄 pending/route.ts   # GET - Pending distributions
│           │
│           ├── 📁 distribute/
│           │   └── 📄 route.ts           # POST - Mark as distributed
│           │
│           └── 📁 users/
│               └── 📄 route.ts           # GET - List all users
│
├── 📁 components/
│   ├── 📁 shared/
│   │   ├── 📄 Header.tsx         # Site header with wallet connect
│   │   └── 📄 Footer.tsx         # Site footer
│   │
│   ├── 📁 wheel/
│   │   ├── 📄 WheelGame.tsx      # Main wheel component
│   │   └── 📄 BuySpinsModal.tsx  # Purchase spins modal
│   │
│   ├── 📁 admin/
│   │   ├── 📄 AdminHeader.tsx    # Admin navigation
│   │   ├── 📄 AdminSidebar.tsx   # Sidebar menu
│   │   └── 📄 StatsCard.tsx      # Dashboard stat cards
│   │
│   └── 📁 providers/
│       └── 📄 WalletProvider.tsx # Sui wallet provider
│
├── 📁 lib/
│   ├── 📄 mongodb.ts             # MongoDB connection
│   ├── 📄 auth.ts                # JWT utilities
│   ├── 📄 sui.ts                 # SUI RPC utilities
│   └── 📄 utils.ts               # Helper functions
│
├── 📁 models/
│   ├── 📄 User.ts                # User model
│   ├── 📄 Spin.ts                # Spin model
│   ├── 📄 Payment.ts             # Payment model
│   ├── 📄 Admin.ts               # Admin user model
│   ├── 📄 AdminConfig.ts         # Config singleton
│   ├── 📄 Referral.ts            # Referral tracking
│   ├── 📄 AdminInvite.ts         # Invite codes
│   └── 📄 index.ts               # Barrel export
│
├── 📁 types/
│   ├── 📄 index.ts               # All TypeScript types
│   └── 📄 api.ts                 # API response types
│
├── 📁 scripts/
│   ├── 📄 admin-create.ts        # Create super admin CLI
│   ├── 📄 admin-list.ts          # List admins CLI
│   ├── 📄 admin-delete.ts        # Delete admin CLI
│   └── 📄 seed-defaults.ts       # Seed config CLI
│
└── 📁 public/
    └── 📄 favicon.ico
```

---

## 🗄️ MongoDB Collections

### 1. `users` Collection

Stores all user wallet accounts and spin balances.

```javascript
{
  _id: ObjectId,
  
  // Wallet
  wallet: "0x...",                      // Lowercase, unique, indexed
  
  // Spin Balances
  freeSpins: 2,                         // From staking eligibility
  purchasedSpins: 5,                    // Bought with SUI
  bonusSpins: 1,                        // Promotional
  
  // Referral
  referralCode: "ABC123",               // Unique code for sharing
  referredBy: "0x..." | null,           // Who referred this user
  
  // Stats
  totalSpins: 50,
  totalWonUSD: 250.00,
  
  // Free Spin Cooldown
  lastFreeSpinAt: Date | null,
  nextFreeSpinAt: Date | null,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// { wallet: 1 } unique
// { referralCode: 1 } unique
// { referredBy: 1 }
```

---

### 2. `spins` Collection

Records every spin with prize details and distribution status.

```javascript
{
  _id: ObjectId,
  wallet: "0x...",                      // User who spun
  
  // Spin Type
  spinType: "free" | "purchased" | "bonus",
  
  // Randomness (for provable fairness)
  serverSeed: "abc123...",              // Random seed used
  randomValue: 0.7342,                  // 0-1 random number
  
  // Result
  slotIndex: 5,                         // Which slot it landed on (0-15)
  prizeType: "liquid_victory" | "locked_victory" | "suitrump" | "no_prize",
  prizeAmount: 16667,                   // Token amount
  prizeValueUSD: 50,                    // USD value
  lockDuration: "1_week" | "3_month" | "1_year" | "3_year" | null,
  
  // Distribution Status
  status: "pending" | "distributed" | "failed",
  distributedAt: Date | null,
  distributedTxHash: "0x..." | null,    // On-chain TX hash
  distributedBy: "admin_username" | null,
  failureReason: String | null,
  
  // Referral (for commission tracking)
  referredBy: "0x..." | null,
  referralCommission: 1667 | null,      // 10% of prize
  
  // Metadata
  createdAt: Date,
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
}

// Indexes:
// { wallet: 1, createdAt: -1 }
// { status: 1, createdAt: 1 }
// { referredBy: 1, createdAt: -1 }
```

---

### 3. `payments` Collection

Tracks all SUI payments for spin purchases.

```javascript
{
  _id: ObjectId,
  
  // Transaction Details (from blockchain)
  txHash: "0x...",                      // Unique - can only claim once
  senderWallet: "0x...",                // Who sent payment
  recipientWallet: "0x...",             // Admin wallet (receiver)
  amountMIST: "5000000000",             // Raw amount in MIST
  amountSUI: 5,                         // Parsed SUI amount
  
  // Claim Status
  claimStatus: "unclaimed" | "claimed" | "manual" | "pending_approval",
  claimedBy: "0x..." | null,            // User who claimed
  claimedAt: Date | null,
  
  // Spin Credit
  spinsCredited: 5,                     // How many spins given
  rateAtClaim: 1,                       // SUI per spin at claim time
  
  // Manual Credit (by admin)
  manualCredit: false,
  creditedByAdmin: "richie" | null,
  adminNote: "Bonus for early supporter" | null,
  
  // Blockchain Data
  blockNumber: 12345678,
  timestamp: Date,                      // TX timestamp from chain
  
  // Processing
  discoveredAt: Date,                   // When system first saw it
  createdAt: Date
}

// Indexes:
// { txHash: 1 } unique
// { senderWallet: 1, claimStatus: 1 }
// { claimStatus: 1 }
```

---

### 4. `admins` Collection

Admin user accounts (username/password auth).

```javascript
{
  _id: ObjectId,
  
  username: "richie",                   // Unique, lowercase
  passwordHash: "$argon2id$...",        // Argon2id hashed
  
  role: "super_admin" | "admin",        // Super admin can invite others
  
  // Session
  sessionToken: "abc123..." | null,
  sessionExpiresAt: Date | null,
  
  // Activity
  lastLoginAt: Date | null,
  lastLoginIP: "192.168.1.1" | null,
  
  // Timestamps
  createdAt: Date,
  createdBy: "system" | "other_admin",
  updatedAt: Date
}

// Indexes:
// { username: 1 } unique
// { sessionToken: 1 }
```

---

### 5. `admininvites` Collection

Invite codes for new admin registration.

```javascript
{
  _id: ObjectId,
  
  code: "INV-ABC123XYZ",                // Unique invite code
  createdBy: "richie",                  // Admin who created it
  assignedRole: "admin",                // Role to assign
  
  status: "pending" | "used" | "expired",
  usedBy: "newadmin" | null,
  
  expiresAt: Date,                      // 24 hours from creation
  createdAt: Date,
  usedAt: Date | null
}

// Indexes:
// { code: 1 } unique
// { expiresAt: 1 } TTL index (auto-delete expired)
```

---

### 6. `adminconfigs` Collection (Singleton)

Single document storing all configuration.

```javascript
{
  _id: "main",                          // Always "main"
  
  // Spin Purchase
  spinRateSUI: 1,                       // SUI per spin
  spinPurchaseEnabled: true,
  maxSpinsPerPurchase: 100,
  
  // Admin Wallet
  adminWalletAddress: "0x...",          // Receives SUI payments
  
  // Payment Verification
  paymentLookbackHours: 48,
  minPaymentSUI: 1,
  largePaymentThreshold: 10,            // Requires admin approval
  
  // Prize Table (dynamic, 4-32 slots)
  prizeTable: [
    {
      slotIndex: 0,
      type: "liquid_victory",
      amount: 1667,
      valueUSD: 5,
      weight: 3.0,                      // Probability weight
      lockDuration: null
    },
    {
      slotIndex: 1,
      type: "locked_victory",
      amount: 16667,
      valueUSD: 50,
      weight: 2.0,
      lockDuration: "3_month"
    },
    // ... up to 32 slots
  ],
  
  // Referral System
  referralEnabled: true,
  referralCommissionPercent: 10,
  
  // Free Spin Requirements
  freeSpinMinStakeUSD: 20,              // Min staking to qualify
  freeSpinCooldownHours: 24,
  freeSpinsPerDay: 1,
  
  // Token Pricing
  victoryPriceUSD: 0.003,
  
  // Metadata
  updatedAt: Date,
  updatedBy: "richie"
}
```

---

### 7. `referrals` Collection

Tracks referral relationships and earnings.

```javascript
{
  _id: ObjectId,
  
  referrerWallet: "0x...",              // Who referred
  referredWallet: "0x...",              // Who was referred
  
  // Stats
  totalSpinsByReferred: 25,
  totalCommissionVICT: 50000,
  
  // Timestamps
  linkedAt: Date,
  lastActivityAt: Date
}

// Indexes:
// { referrerWallet: 1 }
// { referredWallet: 1 } unique
```

---

### 8. `affiliaterewards` Collection (Future)

Weekly affiliate commission payouts.

```javascript
{
  _id: ObjectId,
  
  referrerWallet: "0x...",
  
  // Source
  fromSpinId: ObjectId,
  fromWallet: "0x...",
  
  // Reward
  rewardAmountVICT: 3333,
  rewardValueUSD: 10,
  
  // Batching
  weekEnding: Date,                     // Sunday of payout week
  
  // Status
  status: "pending" | "paid",
  paidAt: Date | null,
  paidTxHash: "0x..." | null
}

// Indexes:
// { referrerWallet: 1, weekEnding: -1 }
// { status: 1, weekEnding: 1 }
```

---

## 🔌 API Endpoints

### User Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/nonce` | Get nonce for wallet signature | Public |
| POST | `/api/auth/verify` | Verify signature, create session | Public |
| POST | `/api/auth/refresh` | Refresh access token | Token |
| POST | `/api/auth/logout` | Invalidate session | Token |
| GET | `/api/auth/me` | Get current user info + balances | Token |

### Spin Operations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/spin/eligibility` | Check if user can spin | Token |
| POST | `/api/spin` | Execute spin → returns `slotIndex` | Token |
| GET | `/api/spin/history` | Get user's spin history | Token |

### Payment (User)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payment/claim` | Claim spins from TX hash | Token |
| GET | `/api/payment/scan` | Scan for user's unclaimed TXs | Token |

### Public Config

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/config` | Get prize table, admin wallet, spin rate | Public |

### Admin Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/auth/login` | Login with username/password | Public |
| POST | `/api/admin/auth/logout` | End admin session | Admin |
| GET | `/api/admin/auth/me` | Get current admin info | Admin |
| POST | `/api/admin/auth/invite` | Generate invite code | Super Admin |
| POST | `/api/admin/auth/register` | Register with invite code | Public + Code |

### Admin Operations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/config` | Get full config | Admin |
| PUT | `/api/admin/config` | Update config (prize table, etc.) | Super Admin |
| POST | `/api/admin/seed` | Seed default configuration | Super Admin |
| GET | `/api/admin/revenue` | View all incoming SUI payments | Admin |
| GET | `/api/admin/revenue/refresh` | Refresh from blockchain | Admin |
| POST | `/api/admin/spins/credit` | Manually credit spins to user | Admin |
| GET | `/api/admin/spins/pending` | List pending prize distributions | Admin |
| POST | `/api/admin/distribute` | Mark prize as distributed | Admin |
| GET | `/api/admin/users` | List all users | Admin |

---

## 🔄 User Flows

### Flow 1: First Time User

```
1. User visits /wheel
2. Connects Sui wallet (via dapp-kit)
3. Clicks "Sign to Play"
4. Signs nonce message with wallet
5. Backend verifies signature
6. Backend checks main SuiDex DB for staking
7. If staked $20+, user gets 1 free spin
8. User clicks SPIN
9. Backend generates random prize, saves to DB
10. Returns slotIndex to frontend
11. Wheel animates to winning slot (5 seconds)
12. Modal shows prize details
13. Admin distributes within 48 hours
```

### Flow 2: Buy Spins

```
1. User clicks "Buy Spins"
2. Modal shows admin wallet address
3. User manually sends SUI via wallet
4. User clicks "I've Paid" → enters TX hash
5. Backend verifies TX on SUI blockchain:
   - Correct recipient (admin wallet)
   - Amount >= min payment
   - TX not already claimed
6. If valid, credits spins immediately
7. If amount > 10 SUI, requires admin approval
8. User can spin with purchased spins
```

### Flow 3: Admin Prize Distribution

```
1. Admin logs in at /admin/login
2. Goes to /admin/distribute
3. Sees list of pending winning spins
4. Filters by prize type
5. For each spin:
   - Sends tokens on-chain
   - Enters TX hash in admin panel
   - Clicks "Mark Distributed"
6. Spin status changes to "distributed"
7. Can export CSV for batch processing
```

---

## ✅ Build Status

### ✅ COMPLETED

| Component | Status | Notes |
|-----------|--------|-------|
| Wheel UI | ✅ Done | Dynamic slots, animations, responsive |
| Wheel Algorithm | ✅ Done | Works with any slot count (4-32) |
| Prize Table Display | ✅ Done | Compact 2-column grid |
| Spin Animation | ✅ Done | 5s cubic-bezier, lands on correct slot |
| Result Modal | ✅ Done | Shows prize, share button |
| Buy Spins Modal | ✅ Done | Shows admin wallet, copy button |
| Tab Navigation | ✅ Done | Wheel / Spins / Prizes tabs |
| Tooltip | ✅ Done | Colored background, full details |
| Confetti | ✅ Done | On winning spins |
| Header/Footer | ✅ Done | Consistent across pages |
| Theme | ✅ Done | Dark green "Crypto Forest" |

### 🔄 IN PROGRESS

| Component | Status | Notes |
|-----------|--------|-------|
| User Auth API | 🔄 Partial | Nonce + verify working, need refresh |
| Spin API | 🔄 Partial | POST /spin working |
| Admin Login | 🔄 Partial | Basic login working |

### ❌ NOT STARTED

| Component | Priority | Notes |
|-----------|----------|-------|
| Payment Claim API | High | User claims TX hash |
| Payment Scan API | Medium | Auto-scan blockchain |
| Admin Dashboard | High | Stats, seed button |
| Admin Users Page | High | Credit spins manually |
| Admin Config Page | Medium | Edit prize table |
| Admin Distribute Page | High | Mark prizes distributed |
| Admin Revenue Page | Medium | View incoming payments |
| Referral System | Low | Future feature |
| Free Spin Eligibility | Medium | Check main SuiDex DB |
| CLI Scripts | Medium | admin:create, seed |

---

## 🔐 Environment Variables

```bash
# .env.local

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/suidex_games

# Main SuiDex DB (read-only for staking check)
MAIN_SUIDEX_MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/suidex_main

# JWT
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Admin
ADMIN_SESSION_SECRET=another-secret-for-admin

# SUI RPC
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443

# Admin Wallet (receives payments)
ADMIN_WALLET_ADDRESS=0x...

# App
NEXT_PUBLIC_APP_URL=https://fun.suidex.org
```

---

## 🛠️ CLI Scripts

### Create Super Admin

```bash
pnpm admin:create
# Prompts for username and password
# Creates first super admin account
```

### List Admins

```bash
pnpm admin:list
# Shows all admin accounts
```

### Delete Admin

```bash
pnpm admin:delete <username>
# Removes an admin account
```

### Seed Defaults

```bash
pnpm seed:defaults
# Seeds default prize table and config
# Can also do from admin dashboard UI
```

---

## 📦 Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "admin:create": "tsx scripts/admin-create.ts",
    "admin:list": "tsx scripts/admin-list.ts",
    "admin:delete": "tsx scripts/admin-delete.ts",
    "seed:defaults": "tsx scripts/seed-defaults.ts"
  }
}
```

---

## 🔒 Security Notes

| Area | Implementation |
|------|----------------|
| User Auth | Wallet signature (implicit 2FA) |
| Admin Auth | Username/password (Argon2id hashed) |
| JWT | Short-lived access tokens (15m) |
| Refresh Tokens | httpOnly cookies (7 days) |
| Prize Randomness | crypto.randomBytes() server-side |
| TX Verification | Direct SUI RPC query |
| Rate Limiting | Per-IP limits on sensitive endpoints |
| Payment Claims | Each TX hash can only be claimed once |

---

## 📞 Support

For technical questions, contact the SuiDex development team.

---

*Documentation generated January 2026*