import type { Metadata, Viewport } from 'next'
import { Inter, Orbitron, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import '@mysten/dapp-kit/dist/index.css'
import { SuiProvider } from '@/components/providers/SuiProvider'

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
    default: 'SuiDex Games | Spin to Win Victory Tokens',
    template: '%s | SuiDex Games',
  },
  description:
    'Play games and win Victory tokens! Free daily spins for stakers. Part of the SuiDex ecosystem.',
  keywords: [
    'SuiDex',
    'Victory Token',
    'Spin to Win',
    'Crypto Games',
    'SUI Blockchain',
    'DeFi Gaming',
  ],
  authors: [{ name: 'SuiDex Team' }],
  creator: 'SuiDex',
  publisher: 'SuiDex',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'SuiDex Games',
    description: 'Spin to win Victory tokens! Free daily spins for stakers.',
    url: '/',
    siteName: 'SuiDex Games',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SuiDex Games',
    description: 'Spin to win Victory tokens! Free daily spins for stakers.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#040a04',
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
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <SuiProvider>
          {children}
        </SuiProvider>
      </body>
    </html>
  )
}
