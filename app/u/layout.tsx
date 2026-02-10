import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Player Profile - Stats & Achievements',
  description:
    'View player stats, prize wins, badges, and achievements on SuiDex Games. The #1 play-to-earn gaming platform on SUI blockchain.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function UserProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
