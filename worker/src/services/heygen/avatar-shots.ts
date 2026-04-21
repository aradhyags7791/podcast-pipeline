import type { Page } from 'playwright'
import * as fs from 'fs/promises'
import * as path from 'path'
import { config } from '../../config'
import { downloadFromR2, uploadFileToR2 } from '../r2'

async function safeClick(
  page: Page,
  selectors: string[],
  actionLabel: string,
  episodeLabel: string,
): Promise<void> {
  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout: 10000, state: 'visible' })
      await page.locator(sel).first().scrollIntoViewIfNeeded()
      await page.locator(sel).first().click()
      console.log(`[heygen] ${episodeLabel} — clicked "${actionLabel}" via ${sel}`)
      return
    } catch { continue }
  }
  const shot = path.join(process.cwd(), 'tmp', `error-${actionLabel.replace(/\s+/g, '-')}-${Date.now()}.png`)
  await page.screenshot({ path: shot, fullPage: true })
  throw new Error(`Cannot find "${actionLabel}". Screenshot: ${shot}. Tried: ${selectors.join(', ')}`)
}

async function safeFill(
  page: Page,
  selectors: string[],
  value: string,
  fieldLabel: string,
  episodeLabel: string,
): Promise<void> {
  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout: 10000, state: 'visible' })
      await page.locator(sel).first().scrollIntoViewIfNeeded()
      await page.locator(sel).first().fill(value)
      console.log(`[heygen] ${episodeLabel} — filled "${fieldLabel}" via ${sel}`)
      return
    } catch { continue }
  }
  throw new Error(`Cannot find "${fieldLabel}". Tried: ${selectors.join(', ')}`)
}

async function uploadElement(
  page: Page,
  filePath: string,
  elementType: 'audio' | 'image',
  episodeLabel: string,
): Promise<void> {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    safeClick(page, [
      `button:has-text("Upload ${elementType}")`,
      `button:has-text("Add ${elementType}")`,
      `[data-type="${elementType}"]`,
      `input[type="file"][accept*="${elementType}"]`,
      `.upload-${elementType}`,
    ], `Upload ${elementType}`, episodeLabel),
  ])
  await fileChooser.setFiles(filePath)
  console.log(`[heygen] ${episodeLabel} — uploaded ${elementType}: ${path.basename(filePath)}`)
}

async function waitAndDownload(
  page: Page,
  tmpDir: string,
  segmentIndex: number,
  episodeLabel: string,
): Promise<string> {
  const timeoutMs = config.heygenTimeoutMinutes * 60 * 1000
  const pollMs = config.heygenPollIntervalSeconds * 1000
  const deadline = Date.now() + timeoutMs

  console.log(`[heygen] ${episodeLabel} — waiting for video generation (timeout: ${config.heygenTimeoutMinutes}min)`)

  const mp4Path = path.join(tmpDir, `segment-${segmentIndex}.mp4`)

  while (Date.now() < deadline) {
    // Try to find a download button or completed video
    const downloadBtns = [
      'button:has-text("Download")',
      'a[download]',
      'a:has-text("Download")',
      '[data-testid="download-button"]',
      '.download-btn',
    ]
    for (const sel of downloadBtns) {
      try {
        const el = page.locator(sel).first()
        if (await el.isVisible({ timeout: 2000 })) {
          // Intercept the download
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 30000 }),
            el.click(),
          ])
          await download.saveAs(mp4Path)
          console.log(`[heygen] ${episodeLabel} — downloaded segment ${segmentIndex}`)
          return mp4Path
        }
      } catch { continue }
    }

    await page.waitForTimeout(pollMs)
  }

  const shot = path.join(process.cwd(), 'tmp', `timeout-seg-${segmentIndex}-${Date.now()}.png`)
  await page.screenshot({ path: shot, fullPage: true })
  throw new Error(`HeyGen timed out after ${config.heygenTimeoutMinutes}min for segment ${segmentIndex}. Screenshot: ${shot}`)
}

export async function generateSegment(
  page: Page,
  prompt: { lang: string; prompt: string },
  audioR2Key: string,
  imageR2Key: string,
  segmentIndex: number,
  episodeId: string,
): Promise<string> {
  const label = `ep-${episodeId.slice(0, 8)}-seg-${segmentIndex}`
  const tmpDir = path.join(process.cwd(), 'tmp', episodeId)
  await fs.mkdir(tmpDir, { recursive: true })

  const audioPath = await downloadFromR2(audioR2Key, path.join(tmpDir, 'voice.mp3'))
  const imagePath = await downloadFromR2(imageR2Key, path.join(tmpDir, 'reference.jpg'))

  // 1. Navigate to Avatar Shots
  await page.goto('https://app.heygen.com/avatars', { waitUntil: 'networkidle', timeout: 30000 })

  await safeClick(page, [
    'button:has-text("Avatar Short")',
    'button:has-text("Avatar Shots")',
    '[data-tab="avatar-short"]',
    'text=Avatar Short',
    'a:has-text("Avatar Short")',
  ], 'Avatar Short tab', label)

  // 2. Select avatar
  await safeClick(page, [
    `[data-name="${config.heygenAvatarName}"]`,
    `img[alt="${config.heygenAvatarName}"]`,
    `.avatar-card:has-text("${config.heygenAvatarName}")`,
    `text=${config.heygenAvatarName}`,
    `[title="${config.heygenAvatarName}"]`,
  ], `avatar: ${config.heygenAvatarName}`, label)

  // 3. Fill prompt
  const promptStr = JSON.stringify(prompt)
  await safeFill(page, [
    'textarea[placeholder*="prompt" i]',
    'textarea[placeholder*="describe" i]',
    '[data-testid="prompt-input"]',
    'textarea',
    '.prompt-textarea',
  ], promptStr, 'prompt textarea', label)

  // 4. Upload audio
  await uploadElement(page, audioPath, 'audio', label)

  // 5. Upload image
  await uploadElement(page, imagePath, 'image', label)

  // 6. Generate
  await safeClick(page, [
    'button:has-text("Generate")',
    '[data-testid="generate-button"]',
    'button[type="submit"]:has-text("Generate")',
    '.generate-btn',
  ], 'Generate button', label)

  // 7. Wait for download
  const mp4Path = await waitAndDownload(page, tmpDir, segmentIndex, label)

  // 8. Upload to R2
  const r2Key = `segments/${episodeId}/${segmentIndex}.mp4`
  await uploadFileToR2(mp4Path, r2Key, 'video/mp4')

  return r2Key
}
