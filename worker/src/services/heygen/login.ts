import type { Page } from 'playwright'
import { config } from '../../config'
import { getBrowserContext } from '../browser'

let _loggedIn = false

export async function ensureHeyGenLogin(): Promise<Page> {
  const context = await getBrowserContext()
  const page = await context.newPage()

  if (_loggedIn) {
    // Verify session still valid
    try {
      await page.goto('https://app.heygen.com/home', { waitUntil: 'networkidle', timeout: 15000 })
      const url = page.url()
      if (!url.includes('/login') && !url.includes('/sign-in')) {
        console.log('[heygen:login] session still valid')
        return page
      }
    } catch {}
    _loggedIn = false
  }

  console.log('[heygen:login] logging in as', config.heygenEmail)
  await page.goto('https://app.heygen.com/login', { waitUntil: 'networkidle', timeout: 30000 })

  // Fill credentials
  await page.locator('input[type="email"], input[placeholder*="email" i]').first().fill(config.heygenEmail)
  await page.locator('input[type="password"]').first().fill(config.heygenPassword)

  await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Continue")').first().click()

  // Wait for redirect away from login
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30000 })

  _loggedIn = true
  console.log('[heygen:login] logged in successfully')
  return page
}

export function resetLoginState() {
  _loggedIn = false
}
