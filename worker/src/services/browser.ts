import { chromium, type Browser, type BrowserContext } from 'playwright'

let _browser: Browser | null = null
let _context: BrowserContext | null = null

export async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,900',
      ],
    })
    console.log('[browser] Chromium launched')
  }
  return _browser
}

export async function getBrowserContext(): Promise<BrowserContext> {
  if (!_context) {
    const browser = await getBrowser()
    _context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    console.log('[browser] context created')
  }
  return _context
}

export async function closeBrowser() {
  if (_context) { await _context.close(); _context = null }
  if (_browser) { await _browser.close(); _browser = null }
  console.log('[browser] closed')
}
