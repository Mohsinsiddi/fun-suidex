# SuiDex Games - Deployment Guide

> Step-by-step guide for development setup and production deployment

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Running Scripts](#running-scripts)
6. [Production Deployment](#production-deployment)
7. [Post-Deployment Checklist](#post-deployment-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ (recommended: 20.x)
- pnpm (recommended) or npm
- MongoDB Atlas account
- Vercel account (for deployment)
- Git

---

## Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd suidex-games

# Install dependencies
pnpm install
# or
npm install
```

### 2. Environment Configuration

```bash
# Copy environment example
cp .env.example .env.local

# Edit with your values
nano .env.local
```

### 3. Start Development Server

```bash
pnpm dev
# or
npm run dev
```

Visit `http://localhost:3000`

---

## Database Setup

### Fresh Database Setup

Run these scripts in order for a fresh installation:

```bash
# Step 1: Seed default configuration and badges
pnpm seed:defaults
# This creates:
# - AdminConfig with default settings
# - All badge definitions from constants

# Step 2: Create super admin account
pnpm admin:create
# Follow prompts to create your first admin user

# Step 3 (Optional): Seed mock data for development
pnpm seed:mock
# This creates:
# - 50 test users with random stats
# - 500 spin records
# - 200 payment records
# - Random badge awards
```

### Existing Database Migration

If you already have data and need to add new features:

```bash
# Add canManageBadges permission to existing admins
pnpm migrate:admin-badges
```

### Database Reset (Development Only)

```bash
# WARNING: This deletes ALL data
# Drop collections in MongoDB Atlas or run:
pnpm seed:mock  # This clears and re-seeds mock data
```

---

## Environment Variables

### Required Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/suidex-games

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-jwt-secret-min-32-chars
ADMIN_JWT_SECRET=your-admin-jwt-secret-min-32-chars

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# SUI Network
NEXT_PUBLIC_SUI_NETWORK=mainnet
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
```

### Optional Variables

```env
# Main SuiDex Database (for staking verification)
MAIN_SUIDEX_MONGODB_URI=mongodb+srv://...

# Treasury wallet for payments
TREASURY_WALLET=0x...

# External APIs
COINGECKO_API_KEY=...
```

### Production vs Development

| Variable | Development | Production |
|----------|-------------|------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://fun.suidex.org` |
| `NEXT_PUBLIC_SUI_NETWORK` | `devnet` or `testnet` | `mainnet` |
| `NODE_ENV` | `development` | `production` |

---

## Running Scripts

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database Scripts
pnpm seed:defaults    # Seed config + badges
pnpm seed:mock        # Seed mock data (dev only)
pnpm admin:create     # Create admin user

# Migrations
pnpm migrate:admin-badges  # Add badge permissions to existing admins
```

### Script Execution Order (Fresh Setup)

1. `pnpm install`
2. Configure `.env.local`
3. `pnpm seed:defaults`
4. `pnpm admin:create`
5. `pnpm dev`

---

## Production Deployment

### Vercel Deployment

#### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Select the `suidex-games` folder if monorepo

#### 2. Configure Build Settings

```
Framework Preset: Next.js
Build Command: pnpm build (or npm run build)
Output Directory: .next
Install Command: pnpm install (or npm install)
```

#### 3. Set Environment Variables

Add all variables from `.env.local` to Vercel:
- Go to Project Settings > Environment Variables
- Add each variable for Production environment
- Make sure `NEXT_PUBLIC_*` variables are included

#### 4. Deploy

```bash
# Push to main branch triggers auto-deploy
git push origin main

# Or manual deploy
vercel --prod
```

### Post-Deployment Database Setup

After first deployment:

```bash
# Run from local machine with production MONGODB_URI
MONGODB_URI="your-production-uri" pnpm seed:defaults
MONGODB_URI="your-production-uri" pnpm admin:create
```

Or use Vercel CLI:

```bash
vercel env pull .env.production.local
pnpm seed:defaults
pnpm admin:create
```

---

## Post-Deployment Checklist

### Immediate Checks

- [ ] Site loads at production URL
- [ ] Wallet connection works
- [ ] Admin login works (`/admin/login`)
- [ ] Database connection verified (check admin dashboard)

### Configuration

- [ ] Update `NEXT_PUBLIC_APP_URL` in Vercel env vars
- [ ] Run `seed:defaults` on production database
- [ ] Create production admin account
- [ ] Configure wheel prizes in admin panel
- [ ] Set treasury wallet address in config

### Security

- [ ] JWT secrets are unique and secure (32+ chars)
- [ ] MongoDB user has minimal required permissions
- [ ] Admin credentials are strong
- [ ] CORS settings are correct (if applicable)

### Features to Enable

- [ ] Enable badges in Admin > Config
- [ ] Set early bird cutoff date (if applicable)
- [ ] Configure referral commission rate
- [ ] Set profile sharing minimum spins
- [ ] Review and adjust prize probabilities

---

## Troubleshooting

### Build Errors

**"Dynamic server usage" errors during build**
```
These are expected for API routes using cookies.
They're logged but don't fail the build.
```

**TypeScript errors**
```bash
# Check types
pnpm tsc --noEmit

# Fix common issues
pnpm lint --fix
```

### Database Issues

**Connection timeout**
```
- Check MONGODB_URI is correct
- Whitelist IP in MongoDB Atlas (or allow 0.0.0.0/0)
- Check network connectivity
```

**Missing collections**
```bash
# Re-run seed scripts
pnpm seed:defaults
```

### Authentication Issues

**Admin can't login**
```bash
# Create new admin
pnpm admin:create

# Or check existing admins in MongoDB
# Collection: admins
```

**User session issues**
```
- Clear cookies in browser
- Check JWT_SECRET matches between restarts
- Verify token expiry settings
```

### Common Runtime Errors

**"User not found"**
```
User hasn't completed first spin yet.
Users are created on first spin, not wallet connect.
```

**"Badge not found" / Badge issues**
```bash
# Re-seed badges
pnpm seed:defaults
```

**Profile page shows wrong data**
```
API returns nested structure: data.profile
Check browser console for actual response shape
```

---

## Useful Commands

```bash
# Check MongoDB connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected!'))"

# View production logs (Vercel)
vercel logs

# Tail logs
vercel logs --follow

# Check build output size
du -sh .next/

# Clear Next.js cache
rm -rf .next/cache
```

---

## Support

For issues:
1. Check this documentation
2. Review `docs/suidex_games_documentation.md` for detailed API/DB info
3. Check Vercel deployment logs
4. Review MongoDB Atlas logs

---

*Last updated: January 2026*
