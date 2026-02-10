import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation - How to Play & Win',
  description:
    'Complete guide to SuiDex Games. Learn how to play the Wheel of Victory, buy spins with SUI, earn free spins through staking, and maximize your winnings.',
  keywords: [
    'SuiDex documentation',
    'how to play SuiDex',
    'SUI games guide',
    'Victory token guide',
    'crypto gaming tutorial',
    'SUI staking spins',
  ],
  openGraph: {
    title: 'Documentation | SuiDex Games',
    description: 'Complete guide to SuiDex Games. Learn how to play, earn spins, and win prizes.',
  },
  alternates: {
    canonical: '/docs',
  },
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
