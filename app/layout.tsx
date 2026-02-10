import type { Metadata, Viewport } from 'next'
import { Inter, Orbitron, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import '@mysten/dapp-kit/dist/index.css'
import { SuiProvider } from '@/components/providers/SuiProvider'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'

// ----------------------------------------
// Fonts
// ----------------------------------------

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

// ----------------------------------------
// Metadata
// ----------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'SuiDex Games | #1 Play-to-Earn Games on SUI Blockchain',
    template: '%s | SuiDex Games',
  },
  description:
    'The #1 gamified rewards platform on SUI blockchain. Play Wheel of Victory, win up to $3,500 in VICT tokens, and earn free daily spins by staking. Play-to-earn crypto games with 10% referral rewards.',
  keywords: [
    'SUI blockchain games',
    'SUI crypto games',
    'play to earn SUI',
    'SUI DeFi games',
    'SuiDex Games',
    'Victory Token',
    'spin to win crypto',
    'free crypto spins',
    'SUI staking rewards',
    'crypto wheel game',
    'SuiTrump',
    'VICT token',
  ],
  authors: [{ name: 'SuiDex Team' }],
  creator: 'SuiDex',
  publisher: 'SuiDex',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SuiDex Games',
    startupImage: '/icons/icon-512.png',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'SuiDex Games | Play. Win. Earn.',
    description: 'Gamified rewards platform for Victory token stakers on SUI. Spin the wheel, win up to $3,500, and earn 10% referral rewards. Free daily spins for stakers.',
    url: '/',
    siteName: 'SuiDex Games',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SuiDex Games - Play. Win. Earn.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SuiDex Games | Play. Win. Earn.',
    description: 'Gamified rewards platform for Victory token stakers on SUI. Win up to $3,500 with free daily spins!',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#050609',
}

// ----------------------------------------
// JSON-LD Structured Data
// ----------------------------------------

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://games.suidex.org'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SuiDex',
  url: 'https://suidex.org',
  logo: `${baseUrl}/icons/icon-512.png`,
  sameAs: [
    'https://twitter.com/suidexHQ',
  ],
}

const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'SuiDex Games',
  url: baseUrl,
  description: 'The #1 gamified rewards platform on SUI blockchain. Play games, win up to $3,500 in Victory tokens, and earn free daily spins by staking.',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free daily spins for SUI stakers',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '500',
    bestRating: '5',
  },
  browserRequirements: 'Requires a SUI-compatible wallet (Sui Wallet, Suiet)',
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
    { '@type': 'ListItem', position: 2, name: 'Wheel of Victory', item: `${baseUrl}/wheel` },
    { '@type': 'ListItem', position: 3, name: 'Leaderboard', item: `${baseUrl}/leaderboard` },
    { '@type': 'ListItem', position: 4, name: 'Referral Program', item: `${baseUrl}/referral` },
  ],
}

// ----------------------------------------
// Root Layout
// ----------------------------------------

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${orbitron.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      </head>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <SuiProvider>
          {children}
        </SuiProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
