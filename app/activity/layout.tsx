import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Activity - Recent Spins & Wins',
  description:
    'Watch real-time spins and wins happening on SuiDex Games. See what players are winning on the Wheel of Victory right now.',
  keywords: [
    'SuiDex live activity',
    'crypto game live feed',
    'SUI games wins',
    'real-time crypto gaming',
  ],
  openGraph: {
    title: 'Live Activity Feed | SuiDex Games',
    description: 'Real-time spins and wins on SuiDex Games. See what players are winning right now.',
  },
  alternates: {
    canonical: '/activity',
  },
}

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return children
}
