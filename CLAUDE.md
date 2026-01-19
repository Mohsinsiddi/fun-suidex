# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SuiDex Games is a gamified rewards platform ("Wheel of Victory") for Victory token stakers on the SUI blockchain. Users can spin to win VICT tokens (liquid or locked), SuiTrump tokens, buy spins with SUI, and earn free spins by staking.

## Tech Stack

- **Frontend**: Next.js 14.2.21 (App Router), React 18, TypeScript, Tailwind CSS 3.4.17
- **Blockchain**: @mysten/sui 1.18.0, @mysten/dapp-kit 0.14.37
- **Database**: MongoDB Atlas (Mongoose 8.9.4)
- **Auth**: JWT (jose) for users, bcrypt for admin passwords
- **State**: Zustand 5.0.2
- **Animations**: Framer Motion 11.15.0

## Common Commands

```bash
pnpm dev              # Start development server
pnpm build            # Production build
pnpm lint             # Run ESLint
pnpm admin:create     # Create super admin (interactive CLI)
pnpm admin:list       # List all admin accounts
pnpm admin:delete     # Delete an admin account
pnpm seed:defaults    # Seed default prize configuration
```

## Architecture

### Directory Structure

```
app/
├── globals.css       # SINGLE SOURCE for theme colors (CSS variables)
├── layout.tsx        # Root layout with providers
├── page.tsx          # Landing page
├── wheel/            # Main wheel game
├── r/[code]/         # Referral link handler
├── admin/            # Admin dashboard (login, dashboard, config, revenue)
└── api/              # API routes
    ├── auth/         # User wallet auth (nonce, verify, refresh, logout)
    ├── spin/         # Spin execution and eligibility
    ├── payment/      # Payment claim and scan
    ├── referral/     # Referral system endpoints
    └── admin/        # Admin operations

components/
├── ui/               # Reusable UI components
├── wheel/            # Wheel game components
├── referral/         # Referral system components
├── shared/           # Header, Footer, etc.
└── providers/        # React context providers (WalletProvider)

lib/
├── db/
│   ├── mongodb.ts    # Database connection singleton
│   └── models/       # Mongoose schemas (User, Spin, Payment, Admin, etc.)
├── auth/             # JWT and password utilities
├── sui/              # SUI blockchain utilities
├── stores/           # Zustand stores
└── utils/            # Helper functions

types/                # TypeScript type definitions
scripts/              # CLI scripts for admin management
```

### Key Models (lib/db/models/)

- **User**: Wallet, spin balances (free/purchased/bonus), referral code, stats
- **Spin**: Spin results, prize details, distribution status
- **Payment**: SUI payment tracking, claim status
- **Admin**: Admin accounts with bcrypt password hashes
- **AdminConfig**: Singleton for prize table, spin rates, settings
- **Referral**: Referral relationships and commission tracking

### Authentication

- **Users**: Wallet signature verification → JWT tokens (15m access, 7d refresh)
- **Admins**: Username/password (bcrypt) → session tokens in httpOnly cookies

### API Patterns

API routes follow Next.js 14 App Router conventions:
- Located in `app/api/[route]/route.ts`
- Export `GET`, `POST`, `PUT`, `DELETE` functions
- Use `NextRequest`/`NextResponse`

## Theme Customization

All colors are centralized in `app/globals.css` as CSS custom properties:

```css
:root {
  --accent: #00e5ff;        /* Primary accent (Electric Cyan) */
  --background: #050609;    /* Page background */
  --card: #0f1218;          /* Card backgrounds */
  /* Prize colors: --prize-gold, --prize-purple, --prize-cyan, --prize-liquid */
}
```

Tailwind is configured to use these CSS variables via `tailwind.config.ts`.

## Path Aliases

Uses `@/*` alias mapped to project root (configured in tsconfig.json):
```typescript
import { User } from '@/lib/db/models'
import { Button } from '@/components/ui/Button'
```

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `MONGODB_URI` - Games database
- `MAIN_SUIDEX_MONGODB_URI` - Main SuiDex DB (read-only for staking check)
- `SUI_RPC_URL` - SUI blockchain RPC
- `ADMIN_WALLET_ADDRESS` - Receives spin purchase payments
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `ADMIN_SESSION_SECRET` - Auth secrets

## Business Logic

### Spin Flow
1. User authenticates via wallet signature
2. Check eligibility (free spins from staking, or purchased spins)
3. Server generates random prize using `crypto.randomBytes()`
4. Prize is recorded with "pending" status
5. Admin distributes prizes manually within 48 hours

### Payment Flow
1. User sends SUI to admin wallet externally
2. User submits TX hash for verification
3. Backend queries SUI RPC to verify transaction
4. Spins credited (>10 SUI requires admin approval)

### Referral System
- Users get unique referral code
- 10% commission on referred users' prize wins
- Tracked in `referrals` and `affiliaterewards` collections
