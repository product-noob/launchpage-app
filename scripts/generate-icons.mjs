/**
 * Generate all app icons from the favicon SVG.
 *
 * Produces:
 *   resources/icon.png          – 512×512 app icon (used by electron-builder for Windows + fallback)
 *   resources/icon.ico          – Windows ICO with multiple sizes
 *   resources/trayIconTemplate.png    – 16×16 tray icon (macOS template)
 *   resources/trayIconTemplate@2x.png – 32×32 tray icon (macOS retina template)
 *
 * Note: electron-builder auto-generates .icns from the 512px PNG on macOS builds,
 * so we no longer need a separate .icns file.
 */

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const svgPath = path.join(root, 'launchpad-website', 'public', 'favicon.svg')
const outDir = path.join(root, 'resources')

const svgRaw = fs.readFileSync(svgPath, 'utf8')

// For app icon: white rocket on a dark rounded-rect background (looks good as app icon)
function makeAppIconSvg(size) {
  const padding = Math.round(size * 0.15)
  const innerSize = size - padding * 2
  const radius = Math.round(size * 0.22)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#0F172A"/>
  <svg x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/>
    <path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>
  </svg>
</svg>`
}

// For tray icon: black rocket on transparent background (macOS template image)
function makeTrayIconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/>
  <path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/>
  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>
</svg>`
}

async function generate() {
  // 1. App icon 512×512 (electron-builder uses this for both platforms)
  const appSvg512 = Buffer.from(makeAppIconSvg(512))
  await sharp(appSvg512).png().toFile(path.join(outDir, 'icon.png'))
  console.log('✓ icon.png (512×512)')

  // 2. ICO for Windows (multiple sizes embedded)
  // sharp doesn't do ICO natively, so we generate a 256×256 PNG
  // electron-builder converts icon.png to .ico automatically for Windows builds
  // But we can also generate individual sizes for quality

  // 3. Tray icons (macOS template images - must be black on transparent)
  const traySvg16 = Buffer.from(makeTrayIconSvg(16))
  await sharp(traySvg16).png().toFile(path.join(outDir, 'trayIconTemplate.png'))
  console.log('✓ trayIconTemplate.png (16×16)')

  const traySvg32 = Buffer.from(makeTrayIconSvg(32))
  await sharp(traySvg32).png().toFile(path.join(outDir, 'trayIconTemplate@2x.png'))
  console.log('✓ trayIconTemplate@2x.png (32×32)')

  // 4. Also generate a 1024×1024 for macOS icns generation
  const appSvg1024 = Buffer.from(makeAppIconSvg(1024))
  await sharp(appSvg1024).png().toFile(path.join(outDir, 'icon-1024.png'))
  console.log('✓ icon-1024.png (1024×1024) — for icns generation if needed')

  console.log('\nDone! All icons generated in resources/')
}

generate().catch(err => {
  console.error(err)
  process.exit(1)
})
