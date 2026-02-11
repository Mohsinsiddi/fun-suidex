import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leaderboard - Top Players & Winners',
  description:
    'See the top spinners, biggest winners, and best streaks on SuiDex Games. Compete for the leaderboard on the #1 gaming platform on SUI blockchain.',
  keywords: [
    'SuiDex leaderboard',
    'SUI games leaderboard',
    'crypto games rankings',
    'top crypto winners',
    'SUI blockchain gaming',
    'play to earn leaderboard',
  ],
  openGraph: {
    title: 'Leaderboard | SuiDex Games',
    description:
      'Top spinners, biggest winners, and best streaks. See who\'s winning on SuiDex Games.',
  },
  alternates: {
    canonical: '/leaderboard',
  },
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
