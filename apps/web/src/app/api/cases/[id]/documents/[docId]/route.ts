import { NextResponse } from 'next/server'
import { getDocument, deleteDocument as removeDocumentRow, prisma } from '@pil/db'
import { requireRole } from '@/lib/requireRole'
import { isStorageConfigured, signedDownloadUrl, deleteCaseDocument } from '@/lib/supabase/storage'

type RouteContext = { params: Promise<{ id: string; docId: string }> }

/**
 * Return a short-lived signed URL for a case document (staff only). Bytes are not
 * proxied through this route; the client downloads directly from Supabase and the
 * URL expires after 10 minutes.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const guard = await requireRole('case.update')
  if (guard.denied) return guard.response

  const { id, docId } = await params
  const doc = await getDocument(prisma, docId)
  if (!doc || doc.caseId !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: 'Document storage is not configured' }, { status: 503 })
  }

  const url = await signedDownloadUrl(doc.storagePath)
  if (!url) {
    return NextResponse.json({ error: 'Could not create a download link' }, { status: 500 })
  }
  return NextResponse.json({ url, fileName: doc.fileName })
}

/** Delete a case document from both Storage and the metadata table (staff only). */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const guard = await requireRole('case.refund')
  if (guard.denied) return guard.response

  const { id, docId } = await params
  const doc = await getDocument(prisma, docId)
  if (!doc || doc.caseId !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteCaseDocument(doc.storagePath)
  await removeDocumentRow(prisma, docId)
  return NextResponse.json({ ok: true })
}
