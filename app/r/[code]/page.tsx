import { Metadata } from 'next'
import { APP_BASE_URL } from '@/constants'

export const metadata: Metadata = {
  title: 'Spin the Wheel of Victory | SuiDex Games',
  description: 'Join me on SuiDex Games! Spin the Wheel of Victory and win up to $3,500 in crypto prizes. Free daily spins for stakers.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Spin the Wheel of Victory | SuiDex Games',
    description: 'Join me on SuiDex Games! Spin the Wheel of Victory and win up to $3,500 in crypto prizes. Free daily spins for stakers.',
    url: APP_BASE_URL,
    siteName: 'SuiDex Games',
    type: 'website',
    images: [
      {
        url: `${APP_BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'SuiDex Games - Wheel of Victory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spin the Wheel of Victory | SuiDex Games',
    description: 'Join me on SuiDex Games! Spin the Wheel of Victory and win up to $3,500 in crypto prizes.',
    images: [`${APP_BASE_URL}/og-image.png`],
  },
}

export default async function ReferralRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const redirectUrl = `/?ref=${code}`

  // Render page with OG meta (for X/social crawlers) + instant client redirect for users
  return (
    <meta httpEquiv="refresh" content={`0;url=${redirectUrl}`} />
  )
}
