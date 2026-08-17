// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const { requireRoleMock, isStorageConfiguredMock, uploadCaseDocumentMock, createDocumentMock } = vi.hoisted(
  () => ({
    requireRoleMock: vi.fn(),
    isStorageConfiguredMock: vi.fn(),
    uploadCaseDocumentMock: vi.fn(),
    createDocumentMock: vi.fn(),
  }),
)

vi.mock('@/lib/requireRole', () => ({ requireRole: requireRoleMock }))
vi.mock('@/lib/supabase/storage', () => ({
  isStorageConfigured: isStorageConfiguredMock,
  uploadCaseDocument: uploadCaseDocumentMock,
}))
vi.mock('@pil/db', () => ({ createDocument: createDocumentMock, prisma: {} }))

import { POST } from './route'

const params = Promise.resolve({ id: 'c1' })

function staffGuard() {
  return { denied: false, session: { user: { id: 'u1' } }, role: 'LAWYER' }
}

function postWith(file: { name: string; type: string; content: string }) {
  const form = new FormData()
  form.append('file', new File([file.content], file.name, { type: file.type }))
  return POST(new Request('http://localhost/api/cases/c1/documents', { method: 'POST', body: form }), {
    params,
  })
}

describe('case documents POST route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRoleMock.mockResolvedValue(staffGuard())
    isStorageConfiguredMock.mockReturnValue(true)
    uploadCaseDocumentMock.mockResolvedValue({ storagePath: 'c1/petition.pdf' })
    createDocumentMock.mockResolvedValue({ id: 'd1', fileName: 'petition.pdf' })
  })

  it('rejects callers without case.update permission', async () => {
    requireRoleMock.mockResolvedValue({
      denied: true,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    })
    const res = await POST(
      new Request('http://localhost/api/cases/c1/documents', { method: 'POST', body: new FormData() }),
      { params },
    )
    expect(res.status).toBe(403)
  })

  it('returns 503 when storage is not configured', async () => {
    isStorageConfiguredMock.mockReturnValue(false)
    const res = await postWith({ name: 'petition.pdf', type: 'application/pdf', content: '%PDF-1.4' })
    expect(res.status).toBe(503)
    expect(uploadCaseDocumentMock).not.toHaveBeenCalled()
  })

  it('requires a file field', async () => {
    const res = await POST(
      new Request('http://localhost/api/cases/c1/documents', { method: 'POST', body: new FormData() }),
      { params },
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/missing file/i)
  })

  it('rejects an empty file', async () => {
    const res = await postWith({ name: 'empty.pdf', type: 'application/pdf', content: '' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/file is empty/i)
  })

  it('rejects an unsupported file type', async () => {
    const res = await postWith({ name: 'malware.exe', type: 'application/octet-stream', content: 'MZ' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/unsupported file type/i)
  })

  it('rejects a file over the 15 MB limit', async () => {
    const res = await postWith({
      name: 'huge.pdf',
      type: 'application/pdf',
      content: 'x'.repeat(16 * 1024 * 1024),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/15 MB limit/i)
  })

  it('uploads a valid file to storage and persists the metadata', async () => {
    const res = await postWith({ name: 'petition.pdf', type: 'application/pdf', content: '%PDF-1.4 x' })
    expect(res.status).toBe(201)
    expect(uploadCaseDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 'c1', fileName: 'petition.pdf', mimeType: 'application/pdf' }),
    )
    expect(createDocumentMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ caseId: 'c1', storagePath: 'c1/petition.pdf' }),
    )
    expect((await res.json()).document.id).toBe('d1')
  })
})