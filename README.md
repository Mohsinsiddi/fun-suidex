# SuiDex Games Platform

A gamified rewards platform for Victory token stakers on the SUI blockchain.

## Features

- **Wheel of Victory** - Spin-to-win game with 16 prize slots
- **Free Daily Spins** - For users staking $20+ in Victory pools
- **Spin Purchases** - Buy spins with SUI (manual payment verification)
- **Referral System** - 10% commission on referred user wins
- **Admin Dashboard** - Manage prizes, revenue, and users

## Tech Stack

- **Frontend**: Next.js 14.2.21, React 18, Tailwind CSS 3.4.17
- **Blockchain**: @mysten/sui 1.18.0, @mysten/dapp-kit 0.14.37
- **Database**: MongoDB (Mongoose 8.9.4)
- **Auth**: JWT (jose), bcrypt for admin passwords
- **State**: Zustand 5.0.2
- **Animations**: Framer Motion 11.15.0

## Quick Start

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# MongoDB (create free cluster at mongodb.com/atlas)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/suidex_games

# Optional: Main SuiDex DB for staking data
MAIN_SUIDEX_MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/suidex_main

# SUI Blockchain
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
ADMIN_WALLET_ADDRESS=0x...your_wallet_that_receives_payments...

# JWT Secrets (generate with: openssl rand -base64 64)
JWT_SECRET=your-jwt-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-secret-min-32-chars
ADMIN_SESSION_SECRET=your-admin-secret-min-32-chars

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Create Super Admin (CLI)

```bash
npm run admin:create
# or
pnpm admin:create
```

Follow prompts to create your super admin account.

### 4. Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Seed Default Configuration

Either:
- Login to admin at `/admin/login` → Dashboard → Click "Seed Defaults"
- Or run CLI: `pnpm seed:defaults`

## Project Structure

```
suidex-games/
├── app/
│   ├── globals.css          # 🎨 SINGLE THEME SOURCE - edit colors here
│   ├── layout.tsx
│   ├── page.tsx             # Home page
│   ├── wheel/page.tsx       # Wheel game
│   ├── admin/               # Admin dashboard pages
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── config/
│   │   └── revenue/
│   └── api/                 # API routes
│       ├── auth/
│       ├── spin/
│       ├── payment/
│       └── admin/
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── wheel/               # Wheel game components
│   ├── layout/              # Layout components
│   └── providers/           # React providers
├── lib/
│   ├── db/
│   │   ├── mongodb.ts       # DB connection
│   │   └── models/          # Mongoose schemas
│   ├── auth/                # JWT & password utils
│   ├── sui/                 # Blockchain utils
│   └── utils/               # Helper functions
├── constants/               # Default values & config
├── types/                   # TypeScript types
└── scripts/                 # CLI scripts
```

## Theme Customization

All colors are in **one file**: `app/globals.css`

```css
:root {
  /* Change these to update entire theme */
  --accent: #00ff88;         /* Main accent color */
  --background: #040a04;     /* Page background */
  --card: #0a1a0a;           /* Card background */
  /* ... etc */
}
```

## Admin Access

1. Create admin via CLI: `pnpm admin:create`
2. Login at: `/admin/login`
3. Dashboard at: `/admin/dashboard`

**Admin Features:**
- View/refresh incoming revenue transactions
- Manually credit spins to users
- Update prize table & spin rate
- Distribute pending prizes
- Invite other admins (super admin only)

## Payment Flow

1. User sends SUI to admin wallet (outside app)
2. User clicks "Verify Payment" in app
3. Backend scans blockchain for TX
4. If valid & unclaimed → credit spins
5. If >10 SUI → requires admin approval

## API Endpoints

### User Auth
- `POST /api/auth/nonce` - Get signature nonce
- `POST /api/auth/verify` - Verify signature & login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Spin
- `GET /api/spin/eligibility` - Check spin eligibility
- `POST /api/spin` - Perform spin
- `GET /api/spin/[spinId]/reveal` - Reveal prize

### Payment
- `POST /api/payment/claim` - Claim spins from TX
- `GET /api/payment/scan` - Scan for unclaimed TXs

### Admin
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/config` - Get config
- `PUT /api/admin/config` - Update config
- `POST /api/admin/seed` - Seed defaults
- `GET /api/admin/revenue` - View revenue
- `POST /api/admin/spins/credit` - Manual credit

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

## Scripts

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm start            # Start production
pnpm admin:create     # Create super admin
pnpm admin:list       # List all admins
pnpm admin:delete     # Delete an admin
pnpm seed:defaults    # Seed default config
```

## Security Notes

- Admin auth is username/password (bcrypt hashed)
- User auth is wallet signature (JWT)
- Prize selection uses crypto.randomBytes()
- TX verification queries SUI RPC directly
- Each TX hash can only be claimed once

## License

MIT
