import { expect, test } from '@playwright/test'
import { createLiveCampaign, db, loginAsAdmin, loginAsPublic } from './helpers'

const pdfBytes = Buffer.from('%PDF-1.4 fake document\n')

async function createCaseRow(title: string): Promise<string> {
  const rec = await db.case.create({
    data: {
      entryType: 'FUNDED',
      title,
      summary: 'A case row used as a documents fixture.',
      category: 'ENVIRONMENT',
      stage: 'SUBMITTED',
      goalAmountPaise: 500_000,
    },
  })
  return rec.id
}

test.describe('case documents RBAC', () => {
  test('unauthenticated callers are rejected by the documents API', async ({ request }) => {
    const id = '00000000-0000-0000-0000-000000000000'
    const list = await request.get(`/api/cases/${id}/documents`)
    expect(list.status()).toBe(403)

    const upload = await request.post(`/api/cases/${id}/documents`, {
      multipart: { file: { name: 'petition.pdf', mimeType: 'application/pdf', buffer: pdfBytes } },
    })
    expect(upload.status()).toBe(403)
  })

  test('staff can list documents, uploads report storage offline in mock mode', async ({ page }) => {
    const id = await createLiveCampaign(page, 'Docs case')

    const list = await page.request.get(`/api/cases/${id}/documents`)
    expect(list.status()).toBe(200)
    expect((await list.json()).documents).toEqual([])

    const upload = await page.request.post(`/api/cases/${id}/documents`, {
      multipart: { file: { name: 'petition.pdf', mimeType: 'application/pdf', buffer: pdfBytes } },
    })
    expect(upload.status()).toBe(503)
    expect((await upload.json()).error).toContain('storage')
  })

  test('a missing document returns 404 for staff', async ({ page }) => {
    const id = await createLiveCampaign(page, 'Docs 404')

    const res = await page.request.get(`/api/cases/${id}/documents/${'00000000-0000-0000-0000-000000000000'}`)
    expect(res.status()).toBe(404)
  })

  test('a staff lawyer is denied document deletion', async ({ page }) => {
    const id = await createLiveCampaign(page, 'Docs delete staff')
    const docId = '00000000-0000-0000-0000-000000000000'

    const deleteRes = await page.request.delete(`/api/cases/${id}/documents/${docId}`)
    expect(deleteRes.status()).toBe(403)
  })

  test('an admin reaches the document deletion handler', async ({ page }) => {
    const id = await createCaseRow('Docs delete admin')
    const docId = '00000000-0000-0000-0000-000000000000'

    await loginAsAdmin(page)
    const deleteRes = await page.request.delete(`/api/cases/${id}/documents/${docId}`)
    expect(deleteRes.status()).toBe(404)
  })

  test('the documents page is staff-only and shows the empty state', async ({ page }) => {
    const id = await createLiveCampaign(page, 'Docs page')

    await page.goto(`/dashboard/cases/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Docs page')
    await expect(page.getByText(/staff · case documents/i)).toBeVisible()
    await expect(page.getByText(/no documents filed for this case yet/i)).toBeVisible()
  })

  test('public users are sent away from the documents page', async ({ page }) => {
    const id = await createCaseRow('Docs public blocked')
    await loginAsPublic(page, `docs-${Date.now()}@example.com`)

    await page.goto(`/dashboard/cases/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in')
  })
})