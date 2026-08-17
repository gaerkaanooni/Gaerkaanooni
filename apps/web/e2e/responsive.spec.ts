import { expect, test } from '@playwright/test'

test.describe('navigation responsiveness', () => {
  test('mobile shows the hamburger and toggles the menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const nav = page.getByRole('navigation')
    const toggle = page.getByRole('button', { name: /open menu/i })
    await expect(toggle).toBeVisible()
    await expect(nav.getByRole('link', { name: /submit a case/i })).not.toBeVisible()

    await toggle.click()
    await expect(page.getByRole('button', { name: /close menu/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /submit a case/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /refer someone/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /urgent intake/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /about/i })).toBeVisible()

    await nav.getByRole('link', { name: /about/i }).click()
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('button', { name: /open menu/i })).toBeVisible()
  })

  test('desktop shows the inline links with dot separators', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const nav = page.getByRole('navigation')
    await expect(page.getByRole('button', { name: /open menu/i })).not.toBeVisible()
    const submit = nav.getByRole('link', { name: /submit a case/i })
    const refer = nav.getByRole('link', { name: /refer someone/i })
    await expect(submit).toBeVisible()
    await expect(refer).toBeVisible()

    const separator = await refer.evaluate((el) =>
      getComputedStyle(el, '::before').content.replace(/['"]/g, ''),
    )
    expect(separator).toBe('·')
  })

  test('the homepage hero still renders on a narrow phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gaerkaanooni')
    await expect(page.getByText('Legal matters, funded by the public', { exact: true })).toBeVisible()
  })
})