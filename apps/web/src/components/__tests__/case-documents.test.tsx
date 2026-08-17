import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CaseDocuments, { type CaseDocumentRow } from '../CaseDocuments'

const doc = (over: Partial<CaseDocumentRow> = {}): CaseDocumentRow => ({
  id: 'd1',
  caseId: 'c1',
  storagePath: 'c1/1_petition.pdf',
  fileName: 'petition.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  createdAt: new Date('2026-08-01').toISOString(),
  ...over,
})

describe('CaseDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when a case has no documents', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ documents: [] }), { status: 200 })),
    )
    render(<CaseDocuments caseId="c1" />)
    expect(await screen.findByText(/no documents filed for this case yet/i)).toBeInTheDocument()
  })

  it('renders the document list with size and date', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ documents: [doc(), doc({ id: 'd2', fileName: 'order.pdf', sizeBytes: 3 * 1024 * 1024 })] }), { status: 200 }),
      ),
    )
    render(<CaseDocuments caseId="c1" />)
    expect(await screen.findByText('petition.pdf')).toBeInTheDocument()
    expect(screen.getByText('order.pdf')).toBeInTheDocument()
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument()
    expect(screen.getByText(/3\.0 MB/)).toBeInTheDocument()
  })

  it('uploads a selected file and refreshes the list', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [doc()] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<CaseDocuments caseId="c1" />)
    await screen.findByText(/no documents filed/i)

    await userEvent.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['%PDF-1.4 fake'], 'petition.pdf', { type: 'application/pdf' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() => expect(fetchMock.mock.calls[1]).toBeDefined())
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/cases/c1/documents')
    expect((fetchMock.mock.calls[1]![1] as RequestInit).method).toBe('POST')
    expect((fetchMock.mock.calls[1]![1] as RequestInit).body).toBeInstanceOf(FormData)
    await screen.findByText('petition.pdf')
  })

  it('surfaces an upload error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [] }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'File exceeds the 15 MB limit' }), { status: 400 }),
        ),
    )
    const { container } = render(<CaseDocuments caseId="c1" />)
    await screen.findByText(/no documents filed/i)

    await userEvent.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['x'], 'huge.pdf', { type: 'application/pdf' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/15 MB limit/i)
  })

  it('downloads a signed URL for a document', async () => {
    const openMock = vi.fn()
    vi.stubGlobal('open', openMock)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [doc()] }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ url: 'https://storage.example/signed' }), { status: 200 }),
        ),
    )
    render(<CaseDocuments caseId="c1" />)
    await screen.findByText('petition.pdf')
    await userEvent.click(screen.getByRole('button', { name: 'Download' }))
    await waitFor(() => expect(openMock).toHaveBeenCalledWith('https://storage.example/signed', '_blank', 'noopener'))
  })

  it('deletes a document after confirmation', async () => {
    const confirmMock = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirmMock)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [doc()] }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [] }), { status: 200 })),
    )
    render(<CaseDocuments caseId="c1" />)
    await screen.findByText('petition.pdf')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith('Delete "petition.pdf"?'))
    await screen.findByText(/no documents filed/i)
  })

  it('keeps the document when deletion is cancelled', async () => {
    const confirmMock = vi.fn().mockReturnValue(false)
    vi.stubGlobal('confirm', confirmMock)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ documents: [doc()] }), { status: 200 })),
    )
    render(<CaseDocuments caseId="c1" />)
    await screen.findByText('petition.pdf')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(confirmMock).toHaveBeenCalled()
    expect(screen.getByText('petition.pdf')).toBeInTheDocument()
  })

  it('surfaces a delete error', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ documents: [doc()] }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Delete failed' }), { status: 500 })),
    )
    render(<CaseDocuments caseId="c1" />)
    await screen.findByText('petition.pdf')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/delete failed/i)
  })
})