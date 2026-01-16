// ============================================
// Wallet-based Avatar Generation
// ============================================
// Generates deterministic, unique avatars from wallet addresses
// Same wallet = same avatar, always

// Color palettes for avatar generation
const PALETTES = [
  ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
  ['#A8E6CF', '#DCEDC1', '#FFD3B6', '#FFAAA5', '#FF8B94'],
  ['#667EEA', '#764BA2', '#F093FB', '#F5576C', '#4FACFE'],
  ['#43E97B', '#38F9D7', '#FA709A', '#FEE140', '#4FACFE'],
  ['#FF9A9E', '#FECFEF', '#A18CD1', '#FBC2EB', '#FAD0C4'],
  ['#13547A', '#80D0C7', '#0093E9', '#80D0C7', '#00D2FF'],
  ['#FC466B', '#3F5EFB', '#C471ED', '#12C2E9', '#F64F59'],
  ['#11998E', '#38EF7D', '#56CCF2', '#2F80ED', '#00B4DB'],
]

// Shape types for avatar patterns
type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond'

interface AvatarConfig {
  backgroundColor: string
  foregroundColor: string
  accentColor: string
  pattern: number[]
  shapes: ShapeType[]
}

/**
 * Hash a wallet address to a number
 */
function hashWallet(wallet: string): number {
  let hash = 0
  const cleanWallet = wallet.toLowerCase().replace('0x', '')
  for (let i = 0; i < cleanWallet.length; i++) {
    const char = cleanWallet.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Generate avatar configuration from wallet address
 */
function getAvatarConfig(wallet: string): AvatarConfig {
  const hash = hashWallet(wallet)
  const paletteIndex = hash % PALETTES.length
  const palette = PALETTES[paletteIndex]

  // Generate pattern from wallet bytes
  const cleanWallet = wallet.toLowerCase().replace('0x', '')
  const pattern: number[] = []
  for (let i = 0; i < 16; i++) {
    const byte = parseInt(cleanWallet.substring(i * 2, i * 2 + 2) || '00', 16)
    pattern.push(byte % 2) // 0 or 1 for each cell
  }

  // Determine shapes based on hash
  const shapeTypes: ShapeType[] = ['circle', 'square', 'triangle', 'diamond']
  const shapes: ShapeType[] = []
  for (let i = 0; i < 4; i++) {
    shapes.push(shapeTypes[(hash >> (i * 2)) % 4])
  }

  return {
    backgroundColor: palette[hash % 5],
    foregroundColor: palette[(hash >> 8) % 5],
    accentColor: palette[(hash >> 16) % 5],
    pattern,
    shapes,
  }
}

/**
 * Generate SVG avatar from wallet address
 * Returns an SVG string that can be used as data URL or inline
 */
export function generateAvatarSVG(wallet: string, size: number = 64): string {
  const config = getAvatarConfig(wallet)
  const cellSize = size / 4

  let shapes = ''

  // Generate 4x4 grid pattern (mirrored for symmetry)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const index = row * 2 + col
      if (config.pattern[index]) {
        const x1 = col * cellSize
        const x2 = (3 - col) * cellSize
        const y = row * cellSize
        const color = index % 2 === 0 ? config.foregroundColor : config.accentColor

        // Draw shape on left side
        shapes += generateShape(config.shapes[row % 4], x1, y, cellSize, color)
        // Mirror on right side
        shapes += generateShape(config.shapes[row % 4], x2, y, cellSize, color)
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${config.backgroundColor}" rx="${size * 0.15}"/>
    ${shapes}
  </svg>`
}

/**
 * Generate a shape element
 */
function generateShape(
  type: ShapeType,
  x: number,
  y: number,
  size: number,
  color: string
): string {
  const padding = size * 0.1
  const innerSize = size - padding * 2
  const cx = x + size / 2
  const cy = y + size / 2

  switch (type) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${innerSize / 2}" fill="${color}"/>`

    case 'square':
      return `<rect x="${x + padding}" y="${y + padding}" width="${innerSize}" height="${innerSize}" fill="${color}" rx="${innerSize * 0.1}"/>`

    case 'triangle':
      const points = [
        `${cx},${y + padding}`,
        `${x + padding},${y + size - padding}`,
        `${x + size - padding},${y + size - padding}`,
      ].join(' ')
      return `<polygon points="${points}" fill="${color}"/>`

    case 'diamond':
      const diamondPoints = [
        `${cx},${y + padding}`,
        `${x + size - padding},${cy}`,
        `${cx},${y + size - padding}`,
        `${x + padding},${cy}`,
      ].join(' ')
      return `<polygon points="${diamondPoints}" fill="${color}"/>`

    default:
      return ''
  }
}

/**
 * Generate avatar as data URL (for img src)
 */
export function generateAvatarDataURL(wallet: string, size: number = 64): string {
  const svg = generateAvatarSVG(wallet, size)
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/**
 * Get gradient colors for a wallet (useful for backgrounds)
 */
export function getWalletGradient(wallet: string): { from: string; to: string } {
  const config = getAvatarConfig(wallet)
  return {
    from: config.backgroundColor,
    to: config.foregroundColor,
  }
}

/**
 * Get primary color for a wallet
 */
export function getWalletColor(wallet: string): string {
  const config = getAvatarConfig(wallet)
  return config.backgroundColor
}
