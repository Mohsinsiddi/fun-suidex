import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wheel of Victory - Spin to Win Crypto Prizes',
  description:
    'Spin the Wheel of Victory to win up to $3,500 in Victory tokens, SuiTrump, and more. Free daily spins for SUI stakers. The #1 play-to-earn game on SUI blockchain.',
  keywords: [
    'Wheel of Victory',
    'SUI blockchain games',
    'spin to win crypto',
    'free crypto spins',
    'play to earn SUI',
    'Victory token game',
    'SUI DeFi games',
    'crypto wheel game',
  ],
  openGraph: {
    title: 'Wheel of Victory | SuiDex Games',
    description:
      'Spin to win up to $3,500 in Victory tokens! Free daily spins for SUI stakers. 16 prize slots with VICT, SuiTrump, and more.',
  },
  twitter: {
    title: 'Wheel of Victory | SuiDex Games',
    description:
      'Spin to win up to $3,500 in Victory tokens! Free daily spins for SUI stakers.',
  },
  alternates: {
    canonical: '/wheel',
  },
}

export default function WheelLayout({ children }: { children: React.ReactNode }) {
  return children
}
