export function generateReferralLink(wallet: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://games.suidex.io'
  return `${baseUrl}?ref=${wallet}`
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
