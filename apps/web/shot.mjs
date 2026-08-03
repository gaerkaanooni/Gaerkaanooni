import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: '/tmp/home.png' })
const info = await page.evaluate(() => {
  return {
    figures: [...document.querySelectorAll('.funding-figures')].map(e => e.innerText),
    strongs: [...document.querySelectorAll('.funding-figures strong')].map(e => ({
      text: e.textContent, w: e.offsetWidth, visible: e.offsetParent !== null, font: getComputedStyle(e).fontFamily,
    })),
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
