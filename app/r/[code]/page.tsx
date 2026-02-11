import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: '/' },
}

export default async function ReferralRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  redirect(`/?ref=${code}`)
}
