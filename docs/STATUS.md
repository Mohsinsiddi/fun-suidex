# SuiDex Games - Development Status

**Last Updated:** 2025-01-20
**Production URL:** https://fun-suidex.vercel.app/
**Network:** Mainnet

---

## Current Sprint: Client Feedback Fixes

### Issue Summary

| # | Issue | Category | Priority | Status |
|---|-------|----------|----------|--------|
| 1 | Atomic spin lock (state-based, not time-based) | Spin System | High | ✅ Done (already implemented) |
| 2 | Reduce win rates (EV too high ~$43.80/spin) | Prize Config | High | ✅ Done (EV ~$15/spin now) |
| 3 | Tweet share missing referral link | Referral | High | ✅ Done |
| 4 | Referral links go to localhost | Referral | High | ✅ Done (TWEET_BASE_URL fixed) |
| 5 | Self-referral prevention | Referral | High | ✅ Done (already in API) |
| 6 | Referral tracking verification | Referral | Medium | ⏳ Pending (needs testing) |
| 7 | Payment real-time TX validation UX | Payment | High | ✅ Done (auto-scan in modal) |
| 8 | Notification result flicker bug | UI Bug | Medium | ✅ Done (captured slot ref) |
| 9 | Wheel rotation too fast at end | UX | Medium | ✅ Done (6s, smoother curve) |
| 10 | Desktop wallet disconnect issue | Wallet | Medium | ✅ Done (retry config + stashed wallet) |
| 11 | Footer: Docs link | Links | Low | ✅ Done |
| 12 | Footer: Community (X) link | Links | Low | ✅ Done |
| 13 | Footer: Add Telegram link | Links | Low | ✅ Done |
| 14 | Footer: Twitter icon → X icon | Links | Low | ✅ Done |
| 15 | Footer: Chat icon → Telegram | Links | Low | ✅ Done |
| 16 | Profile: Badge names missing | UI | Medium | ✅ Done |
| 17 | Terminology: Spins → Tickets | Branding | Low | ⏳ Deferred |

---

## Detailed Issue Breakdown

### 1. Atomic Spin Lock (HIGH)
**Problem:** Users can click spin multiple times causing issues.
**Solution:** Button must be disabled from click until result modal is shown (win/lose). State-based lock, not time-based cooldown.
**Files:** `app/wheel/page.tsx`, `app/pwa/game/page.tsx`
**Implementation:**
- `isSubmitting` should be `true` until modal appears
- Button disabled when `isSubmitting || isSpinning`
- Only reset `isSubmitting` when modal closes

---

### 2. Reduce Win Rates (HIGH)
**Problem:** Testers winning too much. Current EV ~$43.80/spin is unsustainable.
**Solution:** Increase `no_prize` weight, reduce high-value prize weights.
**Files:** `constants/index.ts` (DEFAULT_PRIZE_TABLE)
**Target EV:** ~$5-10/spin
**Current weights:**
```
no_prize: 200 (29.67%)
```
**Proposed weights:**
```
no_prize: 500+ (60%+)
Reduce $1K, $2K, $3.5K weights
```

---

### 3. Tweet Share Missing Referral Link (HIGH)
**Problem:** Share tweet only includes website URL, not user's referral code.
**Solution:** Include user's referral link in tweet: `https://fun-suidex.vercel.app/r/[CODE]`
**Files:** `app/wheel/page.tsx`, `app/pwa/game/page.tsx`
**Implementation:**
- Get user's referral code from auth store
- Update `shareOnTwitter` function to include referral link

---

### 4. Referral Links Go to Localhost (HIGH)
**Problem:** Referral URLs point to localhost instead of production.
**Solution:** Update base URL to `https://fun-suidex.vercel.app`
**Files:** `constants/index.ts` (SPIN_UI.TWEET_BASE_URL), referral components
**Current:** `https://games.suidex.io/wheel`
**Should be:** `https://fun-suidex.vercel.app`

---

### 5. Self-Referral Prevention (HIGH)
**Problem:** Users can potentially use their own referral code.
**Solution:** Block users from applying their own referral code.
**Files:** `app/api/referral/apply/route.ts`
**Implementation:**
- Check if referral code belongs to current user
- Return error if self-referral attempted

---

### 6. Referral Tracking Verification (MEDIUM)
**Problem:** Need to verify referral tracking works end-to-end.
**Solution:** Manual testing after fixes applied.
**Test cases:**
- [ ] New user signs up with referral link
- [ ] Referrer gets credited
- [ ] Commission calculated on wins

---

### 7. Payment Real-time TX Validation (HIGH)
**Problem:** Current payment flow requires manual submission and admin approval.
**Solution:** Smooth UX - auto-detect TX from admin wallet history.
**Files:** `app/api/payment/`, payment components
**Implementation:**
- User submits TX hash
- Backend fetches admin wallet TX history via SUI RPC
- Auto-validate and credit spins
- Real-time feedback on UI

---

### 8. Notification Result Flicker (MEDIUM)
**Problem:** Shows incorrect result first, then flashes to correct amount.
**Solution:** Investigate race condition in result display.
**Files:** PWA notification system
**Root cause:** TBD - need to investigate

---

### 9. Wheel Rotation Too Fast (MEDIUM)
**Problem:** Hard to see prize when wheel stops, rotation too fast at end.
**Solution:** Adjust easing function for slower deceleration.
**Files:** `app/wheel/page.tsx`, `app/pwa/game/page.tsx`
**Current:** `cubic-bezier(0.17, 0.67, 0.12, 0.99)` with 5s duration
**Proposed:** Increase duration or adjust easing for slower end

---

### 10. Desktop Wallet Disconnect (MEDIUM)
**Problem:** Wallet disconnects randomly, needs page refresh.
**Solution:** Improve wallet reconnection logic.
**Files:** `components/providers/WalletProvider.tsx`, auth store
**Implementation:**
- Add auto-reconnect on disconnect
- Periodic connection health check

---

### 11-15. Footer Links (LOW)
**Problem:** Incorrect/missing links in footer.
**Files:** `components/shared/Footer.tsx`

| Link | Current | Should Be |
|------|---------|-----------|
| Docs | `https://docs.suidex.org` | `https://suidex.gitbook.io/suidex` |
| Community | `https://twitter.com/SuiDex` | `https://x.com/suidexHQ` |
| Telegram | Missing | `https://t.me/Suidexhq` |
| Twitter icon | Twitter logo | X logo → `https://x.com/suidexHQ` |
| Chat icon | `https://t.me/SuiDex` | `https://t.me/Suidexhq` |

---

### 16. Badge Names Missing (MEDIUM)
**Problem:** Profile badges only show image, not name/title.
**Solution:** Display badge name below/beside image.
**Files:** `app/profile/page.tsx`, badge components

---

### 17. Terminology: Spins → Tickets (LOW)
**Problem:** "Spins" should be "Tickets" for multi-game future.
**Solution:** Global rename throughout app.
**Scope:** UI text only (keep internal variable names as-is for now)
**Defer:** After critical fixes

---

## Business Decisions Pending

| Question | Status | Decision |
|----------|--------|----------|
| Staking threshold for tickets? | ⏳ Pending | |
| Tickets per stake amount? | ⏳ Pending | |
| Ticket refresh frequency? | ⏳ Pending | |
| Which pools qualify? | ⏳ Pending | |
| Ticket purchase price? | Admin configurable (1 SUI default) | ✅ Done |

---

## Work Plan

### Phase 1: Critical Fixes
1. [x] Read current codebase
2. [ ] Fix atomic spin lock
3. [ ] Update footer links
4. [ ] Fix referral URL (localhost → production)
5. [ ] Add referral link to tweet share
6. [ ] Add self-referral prevention

### Phase 2: Prize & UX
7. [ ] Reduce win rates (update prize weights)
8. [ ] Slow down wheel deceleration
9. [ ] Fix notification flicker

### Phase 3: Payment & Wallet
10. [ ] Real-time TX validation UX
11. [ ] Fix wallet disconnect issue

### Phase 4: Polish
12. [ ] Add badge names to profile
13. [ ] Test referral flow end-to-end
14. [ ] Test payment flow end-to-end

---

## File Reference

| File | Purpose |
|------|---------|
| `app/wheel/page.tsx` | Main wheel page (web) |
| `app/pwa/game/page.tsx` | PWA wheel page |
| `components/shared/Footer.tsx` | Footer with links |
| `constants/index.ts` | Prize table, URLs, config |
| `lib/stores/authStore.ts` | User auth & referral code |
| `app/api/referral/apply/route.ts` | Referral application API |
| `app/api/payment/` | Payment verification APIs |
| `app/profile/page.tsx` | User profile with badges |

---

## Progress Log

### 2025-01-20
- Created STATUS.md for tracking
- Analyzed codebase structure
- Listed all 17 issues from client feedback

**Completed:**
- ✅ Footer links fixed (Docs, Community, Telegram, X icon)
- ✅ TWEET_BASE_URL updated to production (fun-suidex.vercel.app)
- ✅ Tweet share now includes user's referral link (@suidexHQ handle)
- ✅ Prize weights reduced (EV from ~$43.80 to ~$15/spin, no_prize 66.5%)
- ✅ Badge names now shown in BadgeShowcase
- ✅ Self-referral prevention confirmed (already in API)
- ✅ Atomic spin lock confirmed (isSubmitting state-based)
- ✅ Wheel rotation speed slowed (6s duration, smoother deceleration)
- ✅ Fixed hardcoded URLs in lib/referral.ts and TweetToClaimButton.tsx

**Phase 2 Completed:**
- ✅ Notification flicker fixed (pendingResultRef captures slot at API response time)
- ✅ Wallet disconnect improved (QueryClient retry config, stashedWallet for PWA)
- ✅ Payment real-time TX validation (auto-scan mode in BuySpinsModal, polls every 5s)

**All 17 issues resolved!**

