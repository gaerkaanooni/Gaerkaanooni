'use client'

import { useCallback, useEffect, useState } from 'react'

export interface CaseDocumentRow {
  id: string
  caseId: string
  storagePath: string
  fileName: string
  mimeType?: string | null
  sizeBytes?: number | null
  uploadedById?: string | null
  createdAt: string
}

function bytesLabel(n?: number | null): string {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Staff document manager. Reacts to the tool card for the operations dashboard.
 * Uploads/list/signed-URL calls all go through the protected `/api/cases/[id]/documents`
 * routes so the `SUPABASE_SERVICE_ROLE_KEY` never reaches the browser.
 */
export default function CaseDocuments({ caseId }: { caseId: string }) {
  const [docs, setDocs] = useState<CaseDocumentRow[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/cases/${caseId}/documents`)
    if (!res.ok) return
    const body = await res.json()
    setDocs((body.documents as CaseDocumentRow[]) ?? [])
  }, [caseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/cases/${caseId}/documents`, { method: 'POST', body: form })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Upload failed')
      setFile(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function download(doc: CaseDocumentRow) {
    setError('')
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${doc.id}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Could not create a download link')
      window.open(body.url as string, '_blank', 'noopener')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    }
  }

  async function remove(doc: CaseDocumentRow) {
    setError('')
    if (!window.confirm(`Delete "${doc.fileName}"?`)) return
    const res = await fetch(`/api/cases/${caseId}/documents/${doc.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? 'Delete failed')
      return
    }
    await refresh()
  }

  return (
    <div>
      <form onSubmit={upload} className="doc-upload">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={!file || busy}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {error && (
        <p role="alert" className="gate-error">
          {error}
        </p>
      )}

      {docs.length === 0 ? (
        <p className="docs-empty">No documents filed for this case yet.</p>
      ) : (
        <ul className="doc-list">
          {docs.map((doc) => (
            <li key={doc.id} className="doc-item">
              <div className="doc-meta">
                <strong>{doc.fileName}</strong>
                <small>
                  {bytesLabel(doc.sizeBytes)}
                  {doc.createdAt
                    ? ` · ${new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                    : ''}
                </small>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="link" onClick={() => void download(doc)}>
                  Download
                </button>
                <button type="button" className="link" onClick={() => void remove(doc)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
