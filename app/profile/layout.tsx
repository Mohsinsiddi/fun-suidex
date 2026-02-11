import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Profile - Stats & Badges',
  description:
    'View your SuiDex Games profile, spin stats, prize history, and badge collection. Share your achievements with other players on SUI blockchain.',
  openGraph: {
    title: 'Player Profile | SuiDex Games',
    description: 'View your stats, badges, and prize history on SuiDex Games.',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
