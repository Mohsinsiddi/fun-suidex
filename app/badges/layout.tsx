import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Badges & Achievements - Collect Them All',
  description:
    'Earn badges and achievements by playing SuiDex Games. Bronze, Silver, Gold, Diamond, and Legendary tiers. Track your progress on SUI blockchain.',
  keywords: [
    'SuiDex badges',
    'crypto game achievements',
    'SUI gaming rewards',
    'play to earn badges',
    'NFT achievements SUI',
  ],
  openGraph: {
    title: 'Badges & Achievements | SuiDex Games',
    description: 'Earn badges from Bronze to Legendary by playing SuiDex Games on SUI blockchain.',
  },
  alternates: {
    canonical: '/badges',
  },
}

export default function BadgesLayout({ children }: { children: React.ReactNode }) {
  return children
}
