import { APP_BASE_URL } from '@/constants'

export function generateReferralLink(wallet: string): string {
  return `${APP_BASE_URL}?ref=${wallet}`
}

export function getWeekEndingDate(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  d.setHours(23, 59, 59, 999)
  return d
}

export function formatWallet(wallet: string, chars: number = 6): string {
  if (!wallet || wallet.length < chars * 2) return wallet || ''
  return `${wallet.slice(0, chars)}...${wallet.slice(-chars)}`
}
