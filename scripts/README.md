# SuiDex Games - Scripts

## Fresh System Setup (First Time)

Run these 3 commands in order:

```bash
# Step 1: Seed config (prize table, spin rates) + badge definitions (35 badges)
pnpm seed:defaults

# Step 2: Create at least one super admin account (interactive)
pnpm admin:create

# Step 3: Start the app
pnpm dev
```

That's it. The system is ready for users.

## Fresh Start (Wipe User Data, Keep Config)

To reset the platform while keeping system config intact:

```bash
pnpm fresh-start
```

This drops all user-generated data (users, spins, profiles, referrals, payments, badges earned, etc.) but keeps:
- Admin accounts
- Badge definitions
- Prize table & config (AdminConfig)

Requires typing "FRESH START" to confirm.

## What Gets Seeded

### `pnpm seed:defaults`
| Collection | What | Count |
|---|---|---|
| `adminconfigs` | Prize table, spin rates, wallet address, feature flags | 1 (singleton) |
| `badges` | Badge definitions (referral, spin, earnings, streak, social, special) | 35 |

### `pnpm admin:create`
| Collection | What |
|---|---|
| `admins` | Super admin account (username + bcrypt password) |

## Collections Reference

### System Config (never wiped)
| Collection | Purpose |
|---|---|
| `adminconfigs` | Singleton config: prize table, spin rates, wallet, feature flags |
| `badges` | Badge definitions: name, tier, criteria, icon |
| `admins` | Admin accounts with bcrypt passwords |

### User Data (wiped by `pnpm fresh-start`)
| Collection | Purpose |
|---|---|
| `users` | Wallet accounts, spin balances, referral codes, stats |
| `spins` | Spin results, prize details, distribution status |
| `user_badges` | Badges earned per user |
| `user_profiles` | Public shareable profiles |
| `referrals` | Referrer/referred relationships |
| `affiliaterewards` | Referral commission tracking |
| `chaintransactions` | SUI payment cache (re-syncable from chain) |
| `payments` | Legacy payment collection |
| `lpcredits` | LP staking/swap spin credits |
| `adminlogs` | Admin action audit trail |
| `admininvites` | Pending admin invite codes |
| `distributioncheckpoints` | Distribution sync progress |
| `transfertokens` | PWA wallet transfer auth tokens |

## Other Scripts

| Command | Script | Purpose |
|---|---|---|
| `pnpm admin:list` | `admin-list.ts` | List all admin accounts |
| `pnpm admin:delete` | `admin-delete.ts` | Delete an admin account |
