/* global console, document, getComputedStyle, process */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3000'
const results = []

async function probe(name, fn) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const consoleErrors = []
  const pageErrors = []
  const failedReq = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  page.on('requestfailed', (r) => failedReq.push(`${r.url()} :: ${r.failure()?.errorText ?? 'unknown'}`))
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE)) failedReq.push(`${r.url()} :: ${r.status()}`)
  })
  try {
    const out = await fn(page)
    results.push({ name, ok: true, out, consoleErrors, pageErrors, failedReq })
  } catch (e) {
    results.push({ name, ok: false, error: String(e).split('\n').slice(0, 6).join(' '), consoleErrors, pageErrors, failedReq })
  }
  await page.close()
  await browser.close()
}

function print(name, r) {
  const issues = [...r.consoleErrors, ...r.pageErrors, ...r.failedReq]
  console.log(`\n=== ${name} ${r.ok ? 'PASS' : 'FAIL'} ===`)
  if (r.out) console.log(JSON.stringify(r.out, null, 2))
  if (r.error) console.log('ERROR:', r.error)
  if (issues.length) {
    console.log(`-- browser issues (${issues.length}) --`)
    issues.slice(0, 12).forEach((i) => console.log('  •', i))
  } else {
    console.log('-- no console errors, no page errors, no failed requests --')
  }
}

await probe('home renders + fonts + css', async (page) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const h1 = (await page.getByRole('heading', { level: 1 }).textContent())?.trim()
  const cards = await page.locator('.campaign-card').count()
  const figures = (await page.locator('.funding-figures').allInnerTexts()).map((s) => s.replace(/\n/g, ' | '))
  const badges = { response: await page.locator('.response-funded').count(), live: await page.locator('.stage-live').count() }
  const css = await page.evaluate(async () => {
    await document.fonts.ready
    const bg = getComputedStyle(document.body).backgroundColor
    const faces = [...document.fonts].map((ff) => `${ff.family} @${ff.weight} -> ${ff.status}`)
    const strong = document.querySelector('.funding-figures strong')
    const figure = strong
      ? { fontFamily: getComputedStyle(strong).fontFamily, widthPx: strong.offsetWidth, visible: strong.offsetParent !== null, text: strong.textContent }
      : null
    return { bodyBg: bg, faces, figure, sheets: [...document.styleSheets].map((s) => (s.href ?? 'inline')).slice(0, 4) }
  })
  return { h1, cards, figures, badges, css }
})

await probe('about page name thesis', async (page) => {
  await page.goto(BASE + '/about', { waitUntil: 'networkidle' })
  const h1 = (await page.getByRole('heading', { level: 1 }).textContent())?.trim()
  const thesis = await page.getByText('They act gaerkaanooni. We sue.').isVisible()
  const h2 = (await page.locator('h2:has-text("Gaerkaanooni")').textContent())?.trim()
  return { h1, thesisVisible: thesis, h2 }
})

await probe('login gate OTP dev-code flow', async (page) => {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.getByLabel(/phone number/i).fill('+91999998888')
  await page.getByRole('button', { name: /send me a code/i }).click()
  await page.getByText(/your code is/i).waitFor({ timeout: 8000 })
  const devCode = (await page.getByText(/your code is/i).locator('strong').textContent())?.trim()
  return { devCodeLength: devCode?.length ?? 0 }
})

await probe('campaign detail + full donation to receipt', async (page) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const hrefs = await page.locator('.campaign-card a[href^="/campaigns/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  let detail = null
  for (const href of [...new Set(hrefs)]) {
    await page.goto(BASE + href, { waitUntil: 'networkidle' })
    if (await page.getByRole('button', { name: /back this campaign/i }).count()) { detail = href; break }
  }
  if (!detail) throw new Error('no live (backable) campaign found')
  const h1 = (await page.getByRole('heading', { level: 1 }).textContent())?.trim()
  const countdown = await page.getByText(/(days|weeks) left/i).count()
  await page.getByLabel(/amount/i).fill('500')
  await page.getByRole('button', { name: /back this campaign/i }).click()
  await page.getByRole('button', { name: /pay ₹500 securely/i }).waitFor({ timeout: 6000 })
  const checkoutNote = await page.getByText(/sandbox|test mode/i).count()
  await page.getByRole('button', { name: /pay ₹500 securely/i }).click()
  await page.getByText(/thank you/i).waitFor({ timeout: 12000 })
  const txn = (await page.locator('body').innerText()).match(/TXN-[A-Z0-9]+/)?.[0]
  const net = await page.getByText(/₹475/i).count()
  return { detail, h1, countdown, checkoutNote, txn, netShown: net > 0 }
})

await probe('mobile viewport no overflow', async () => {
  const browser = await chromium.launch()
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await m.goto(BASE + '/', { waitUntil: 'networkidle' })
  const sw = await m.locator('body').evaluate(() => document.body.scrollWidth)
  const cw = await m.locator('body').evaluate(() => document.documentElement.clientWidth)
  const overflow = sw - cw
  await browser.close()
  return { viewport: '390x844', horizontalOverflowPx: overflow }
})

for (const r of results) print(r.name, r)
const ok = results.every((r) => r.ok && !r.consoleErrors.length && !r.pageErrors.length && !r.failedReq.length)
console.log(`\n${ok ? 'ALL GREEN' : 'ISSUES FOUND'} (${results.length} probes)`)
process.exit(ok ? 0 : 1)