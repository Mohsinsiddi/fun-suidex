'use client'

import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import Link from 'next/link'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { ProfileShareButton } from '@/components/profile'
import { BadgeShowcase } from '@/components/badges'
import { UserSpinHistory } from '@/components/activity'
import {
  User,
  Lock,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  ExternalLink,
  Trophy,
  Flame,
  Calendar,
  Target,
  Sparkles,
  History,
  Save,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import type { BadgeTier } from '@/types/badge'
import { useAuthStore } from '@/lib/stores/authStore'
import { useBadgesStore } from '@/lib/stores/badgesStore'
import { PWAStatusCard } from '@/components/pwa/PWAStatusCard'

interface ProfileData {
  wallet: string
  profileSlug: string | null
  isProfilePublic: boolean
  displayName?: string
  bio?: string
  totalSpins: number
  totalWinsUSD: number
  biggestWinUSD: number
  totalReferred: number
  currentStreak: number
  longestStreak: number
  memberSince: string
  lastActiveAt: string
}

export default function ProfileSettingsPage() {
  const account = useCurrentAccount()
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage()

  // Auth store
  const {
    isAuthenticated,
    isLoading: authLoading,
    wallet,
    profile: authProfile,
    profileEligible,
    profileMinSpins,
    stats,
    error: authError,
    fetchUser,
    login,
    clearError,
    updateProfile: updateAuthProfile
  } = useAuthStore()

  // Badges store
  const {
    userBadges: badges,
    badgeStats,
    isLoadingUser: loadingBadges,
    fetchUserBadges
  } = useBadgesStore()

  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [profile, setProfile] = useState<ProfileData | null>(null)

  // Edit state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)

  // Badge display
  const badgeCount = badgeStats.totalBadges
  const badgesByTier = badgeStats.badgesByTier

  // Fetch auth and badge data on mount/account change
  // Force refresh on profile page to ensure accurate stats
  useEffect(() => {
    if (account?.address) {
      Promise.all([
        fetchUser(true), // Force fresh data for profile
        fetchUserBadges()
      ]).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [account?.address, fetchUser, fetchUserBadges])

  // Build profile data from auth store
  useEffect(() => {
    if (isAuthenticated && wallet) {
      const profileData: ProfileData = {
        wallet,
        profileSlug: authProfile?.slug || null,
        isProfilePublic: authProfile?.isPublic || false,
        displayName: authProfile?.displayName || undefined,
        bio: authProfile?.bio || undefined,
        totalSpins: stats.totalSpins,
        totalWinsUSD: stats.totalWinsUSD,
        biggestWinUSD: stats.biggestWinUSD,
        totalReferred: stats.totalReferred,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        memberSince: stats.memberSince || new Date().toISOString(),
        lastActiveAt: stats.lastActiveAt || new Date().toISOString(),
      }
      setProfile(profileData)
      setDisplayName(authProfile?.displayName || '')
      setBio(authProfile?.bio || '')
      setIsPublic(authProfile?.isPublic || false)
    }
  }, [isAuthenticated, wallet, authProfile, stats])

  const handleSignIn = async () => {
    if (!account?.address) return
    setSigningIn(true)
    setError(null)
    clearError()

    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: account.address }),
      })
      const nonceData = await nonceRes.json()
      if (!nonceData.success) throw new Error(nonceData.error)

      signMessage(
        { message: new TextEncoder().encode(nonceData.data.nonce) },
        {
          onSuccess: async (sig) => {
            const success = await login(account.address, sig.signature, nonceData.data.nonce)
            if (success) {
              await fetchUser()
              await fetchUserBadges()
            } else {
              setError('Verification failed')
            }
            setSigningIn(false)
          },
          onError: () => {
            setError('Signature rejected')
            setSigningIn(false)
          },
        }
      )
    } catch (err: any) {
      setError(err.message)
      setSigningIn(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          isPublic,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccess('Profile updated successfully!')
        // API returns { profile, shareUrl } - map to our expected structure
        const profileInfo = data.data?.profile
        if (profileInfo) {
          // Update local state
          setProfile({
            wallet: profileInfo.wallet,
            profileSlug: profileInfo.slug,
            isProfilePublic: profileInfo.isPublic,
            displayName: profileInfo.displayName,
            bio: profileInfo.bio,
            totalSpins: profileInfo.stats?.totalSpins || profile?.totalSpins || 0,
            totalWinsUSD: profileInfo.stats?.totalWinsUSD || profile?.totalWinsUSD || 0,
            biggestWinUSD: profileInfo.stats?.biggestWinUSD || profile?.biggestWinUSD || 0,
            totalReferred: profileInfo.stats?.totalReferred || profile?.totalReferred || 0,
            currentStreak: profileInfo.stats?.currentStreak || profile?.currentStreak || 0,
            longestStreak: profileInfo.stats?.longestStreak || profile?.longestStreak || 0,
            memberSince: profileInfo.stats?.memberSince || profile?.memberSince || new Date().toISOString(),
            lastActiveAt: profileInfo.stats?.lastActive || profile?.lastActiveAt || new Date().toISOString(),
          })
          setDisplayName(profileInfo.displayName || '')
          setBio(profileInfo.bio || '')
          setIsPublic(profileInfo.isPublic || false)

          // Update auth store
          updateAuthProfile({
            displayName: profileInfo.displayName || null,
            bio: profileInfo.bio || null,
            isPublic: profileInfo.isPublic || false,
            slug: profileInfo.slug || null,
          })
        }
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={20} /> Back to Home
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30">
              <User size={32} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Your Profile</h1>
              <p className="text-text-secondary">Manage your public profile and share your achievements</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : !account ? (
            <div className="p-8 sm:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-accent" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Connect Your Wallet</h2>
              <p className="text-text-secondary mb-6">Connect your wallet to manage your profile</p>
            </div>
          ) : !isAuthenticated ? (
            <div className="p-8 sm:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-accent" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Sign In Required</h2>
              <p className="text-text-secondary mb-6">Sign a message to verify your wallet</p>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <button
                onClick={handleSignIn}
                disabled={signingIn || isSigning}
                className="px-8 py-3 rounded-xl font-semibold bg-accent text-black hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {signingIn || isSigning ? 'Signing...' : 'Sign to Continue'}
              </button>
            </div>
          ) : !profileEligible ? (
            <div className="p-8 sm:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Profile Locked</h2>
              <p className="text-text-secondary mb-6">
                Complete at least {profileMinSpins} spins to unlock your public profile!
              </p>
              <p className="text-sm text-text-muted mb-6">
                You have {profile?.totalSpins || 0} / {profileMinSpins} spins
              </p>
              <Link
                href="/wheel"
                className="inline-flex px-8 py-3 rounded-xl font-semibold bg-accent text-black hover:bg-accent-hover transition-colors"
              >
                Go to Wheel
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Messages */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  {success}
                </div>
              )}

              {/* Profile URL & Share */}
              {profile?.profileSlug && (
                <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-500/10 border border-accent/30">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div>
                      <h3 className="font-bold text-white mb-1 text-sm sm:text-base">Your Profile URL</h3>
                      <p className="text-xs sm:text-sm text-text-secondary font-mono break-all">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/u/{profile.profileSlug}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Link
                        href={`/u/${profile.profileSlug}`}
                        target="_blank"
                        className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white/[0.05] text-white border border-white/[0.1] hover:bg-white/[0.1] transition-colors flex-1 sm:flex-none"
                      >
                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Preview
                      </Link>
                      <ProfileShareButton slug={profile.profileSlug} displayName={displayName} />
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Settings */}
              <div className="p-6 rounded-2xl bg-surface border border-border">
                <h2 className="text-lg font-bold mb-6 text-white">Profile Settings</h2>

                <div className="space-y-5">
                  {/* Visibility Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-background border border-border">
                    <div className="flex items-center gap-3">
                      {isPublic ? (
                        <Eye className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-text-muted flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-white text-sm sm:text-base">Public Profile</p>
                        <p className="text-xs sm:text-sm text-text-secondary">
                          {isPublic ? 'Anyone can view your profile' : 'Only you can see your profile'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPublic(!isPublic)}
                      className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-colors flex-shrink-0 self-end sm:self-auto ${
                        isPublic ? 'bg-accent' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 sm:top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                          isPublic ? 'translate-x-5 sm:translate-x-7' : 'translate-x-0.5 sm:translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Display Name (optional)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter a display name..."
                      maxLength={50}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-white placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                    />
                    <p className="mt-1 text-xs text-text-muted">{displayName.length}/50 characters</p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Bio (optional)
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell others about yourself..."
                      maxLength={160}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-white placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
                    />
                    <p className="mt-1 text-xs text-text-muted">{bio.length}/160 characters</p>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl font-semibold bg-accent text-black hover:bg-accent-hover disabled:opacity-50 transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* PWA Access */}
              {wallet && (
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📱</span> Mobile App (PWA)
                  </h2>
                  <PWAStatusCard wallet={wallet} isAuthenticated={isAuthenticated} />
                </div>
              )}

              {/* Stats Preview */}
              {profile && (
                <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border">
                  <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-white">Your Stats</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    <div className="p-3 sm:p-4 rounded-xl bg-background border border-border text-center">
                      <Target className="w-5 h-5 sm:w-6 sm:h-6 text-accent mx-auto mb-1.5 sm:mb-2" />
                      <p className="text-xl sm:text-2xl font-bold text-white">{profile.totalSpins || 0}</p>
                      <p className="text-[10px] sm:text-xs text-text-muted">Total Spins</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-background border border-border text-center">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mx-auto mb-1.5 sm:mb-2" />
                      <p className="text-xl sm:text-2xl font-bold text-white">${(profile.totalWinsUSD || 0).toFixed(0)}</p>
                      <p className="text-[10px] sm:text-xs text-text-muted">Total Won</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-background border border-border text-center">
                      <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400 mx-auto mb-1.5 sm:mb-2" />
                      <p className="text-xl sm:text-2xl font-bold text-white">{profile.longestStreak || 0}</p>
                      <p className="text-[10px] sm:text-xs text-text-muted">Best Streak</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-background border border-border text-center">
                      <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mx-auto mb-1.5 sm:mb-2" />
                      <p className="text-xl sm:text-2xl font-bold text-white">{badgeCount}</p>
                      <p className="text-[10px] sm:text-xs text-text-muted">Badges</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Member since {formatDate(profile.memberSince)}
                    </span>
                  </div>
                </div>
              )}

              {/* Badges Section */}
              <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white">Your Badges</h2>
                      <p className="text-xs sm:text-sm text-text-secondary">
                        {badgeCount > 0 ? `${badgeCount} badges earned` : 'Start earning badges!'}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/badges"
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors"
                  >
                    View All Badges
                    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Link>
                </div>

                <BadgeShowcase
                  badges={badges}
                  totalCount={badgeCount}
                  badgesByTier={badgesByTier}
                  maxShow={8}
                  showViewAll={false}
                />
              </div>

              {/* Spin History Section */}
              <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-accent/10 border border-accent/30">
                    <History className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">Spin History</h2>
                    <p className="text-xs sm:text-sm text-text-secondary">
                      Your complete spin record
                    </p>
                  </div>
                </div>

                <UserSpinHistory />
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
