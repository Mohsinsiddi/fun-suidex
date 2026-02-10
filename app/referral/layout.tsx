import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Referral Program - Earn 10% Commission Forever',
  description:
    'Earn 10% of every prize your friends win on SuiDex Games. Share your referral link and get paid weekly in Victory tokens. The best crypto referral program on SUI blockchain.',
  keywords: [
    'SuiDex referral',
    'crypto referral program',
    'SUI referral rewards',
    'earn crypto passive income',
    'Victory token referral',
    'play to earn referral SUI',
  ],
  openGraph: {
    title: 'Earn 10% Referral Rewards | SuiDex Games',
    description:
      'Refer friends and earn 10% of every prize they win. Paid weekly in Victory tokens on SUI blockchain.',
  },
  alternates: {
    canonical: '/referral',
  },
}

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return children
}
