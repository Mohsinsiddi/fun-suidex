#!/usr/bin/env node
/**
 * PWA Icon Generator for SuiDex Games
 *
 * Run with: node scripts/generate-icons.js
 *
 * Requires: pnpm add -D canvas (or npm install canvas)
 */

const fs = require('fs');
const path = require('path');

// Try to use canvas if available, otherwise show instructions
let createCanvas;
try {
  createCanvas = require('canvas').createCanvas;
} catch (e) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    PWA Icon Generator                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  To generate icons programmatically, install canvas:          ║
║                                                               ║
║    pnpm add -D canvas                                         ║
║                                                               ║
║  Then run this script again.                                  ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  ALTERNATIVE: Open this file in your browser:                 ║
║                                                               ║
║    scripts/generate-pwa-icons.html                            ║
║                                                               ║
║  Right-click each icon to save, then move to public/icons/    ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function drawIcon(ctx, size) {
  const scale = size / 512;

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#00e5ff');
  gradient.addColorStop(1, '#00b8d4');

  // Rounded rectangle background
  const radius = size * 0.1875;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Gamepad icon
  ctx.save();
  ctx.translate(size * 0.1875, size * 0.25);
  ctx.scale(scale, scale);

  // Controller body
  ctx.fillStyle = '#050609';
  ctx.beginPath();
  ctx.roundRect(0, 0, 320, 256, 40);
  ctx.fill();

  // D-pad vertical
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.roundRect(56, 72, 24, 72, 4);
  ctx.fill();

  // D-pad horizontal
  ctx.beginPath();
  ctx.roundRect(32, 96, 72, 24, 4);
  ctx.fill();

  // Buttons
  ctx.beginPath();
  ctx.arc(248, 84, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(288, 124, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(208, 124, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(248, 164, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Text
  ctx.fillStyle = '#050609';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (size >= 192) {
    ctx.font = `bold ${size * 0.12}px Arial`;
    ctx.fillText('SuiDex', size / 2, size * 0.82);
  } else if (size >= 96) {
    ctx.font = `bold ${size * 0.2}px Arial`;
    ctx.fillText('S', size / 2, size * 0.82);
  }
}

function drawBadge(ctx, size) {
  // Simple circular badge
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#050609';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', size/2, size/2);
}

console.log('Generating PWA icons...\n');

// Generate icon sizes
SIZES.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawIcon(ctx, size);

  const filename = `icon-${size}.png`;
  const filepath = path.join(ICONS_DIR, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filepath, buffer);
  console.log(`  ✓ ${filename}`);
});

// Generate badge
const badgeCanvas = createCanvas(72, 72);
const badgeCtx = badgeCanvas.getContext('2d');
drawBadge(badgeCtx, 72);
const badgePath = path.join(ICONS_DIR, 'badge-72.png');
fs.writeFileSync(badgePath, badgeCanvas.toBuffer('image/png'));
console.log('  ✓ badge-72.png');

console.log(`\n✅ All icons generated in public/icons/`);
