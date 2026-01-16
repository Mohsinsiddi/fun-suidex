'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { PublicProfile, ProfileShareButton } from '@/components/profile'
import { ArrowLeft, Loader2, UserX } from 'lucide-react'
import type { PublicProfileData } from '@/types/profile'

export default function PublicProfilePage() {
  const params = useParams()
  const slug = params?.slug as string

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<PublicProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (slug) {
      fetchProfile()
    }
  }, [slug])

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/profile/${slug}`)
      const data = await res.json()

      if (data.success) {
        setProfile(data.data)
      } else {
        setError(data.error || 'Profile not found')
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-4 sm:py-8 md:py-12 px-3 sm:px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-4 sm:mb-6 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm">Back to Home</span>
          </Link>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12 sm:py-20">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-red-500/10 mb-3 sm:mb-4">
                <UserX className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Profile Not Found</h2>
              <p className="text-text-muted text-sm sm:text-base mb-4 sm:mb-6">{error}</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-black font-medium hover:bg-accent-hover transition-colors min-h-[44px]"
              >
                Go Home
              </Link>
            </div>
          ) : profile ? (
            <>
              {/* Share Button */}
              <div className="flex justify-end mb-3 sm:mb-4">
                <ProfileShareButton
                  slug={profile.slug}
                  displayName={profile.displayName}
                />
              </div>

              {/* Profile Card */}
              <PublicProfile profile={profile} />

              {/* CTA */}
              <div className="mt-6 sm:mt-8 text-center">
                <p className="text-text-muted text-xs sm:text-sm mb-2 sm:mb-3">
                  Want your own profile?
                </p>
                <Link
                  href="/wheel"
                  className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-accent text-black text-sm sm:text-base font-medium hover:bg-accent-hover transition-colors min-h-[44px]"
                >
                  Start Playing
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  )
}
