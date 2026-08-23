import { NextResponse } from 'next/server'
import { createDocument, listDocuments, prisma } from '@pil/db'
import { requireRole } from '@/lib/requireRole'
import { uploadCaseDocument, isStorageConfigured } from '@/lib/supabase/storage'

type RouteContext = { params: Promise<{ id: string }> }

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB
const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

/**
 * Upload a case document (staff only) and persist the Storage object + metadata.
 * Body is `multipart/form-data` with a `file` field. Returns 201 with the new row.
 *
 * When Supabase Storage is not configured, this returns 503 so the client can show
 * a clear "documents storage offline" message (uploads require the service-role key).
 */
export async function POST(request: Request, { params }: RouteContext) {
  const guard = await requireRole('case.update')
  if (guard.denied) return guard.response

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'Document storage is not configured (missing SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 503 },
    )
  }

  const { id } = await params

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file upload' }, { status: 400 })
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File exceeds the 15 MB limit' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type (allow PDF, image, or Word)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const uploaded = await uploadCaseDocument({
    caseId: id,
    fileName: file.name,
    mimeType: file.type,
    buffer,
  })

  const row = await createDocument(prisma, {
    caseId: id,
    storagePath: uploaded.storagePath,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: buffer.byteLength,
    uploadedById: guard.session?.userId ?? guard.role ?? null,
  })

  return NextResponse.json({ ok: true, document: row }, { status: 201 })
}

/** List documents for a case (staff only). */
export async function GET(_request: Request, { params }: RouteContext) {
  const guard = await requireRole('case.update')
  if (guard.denied) return guard.response

  const { id } = await params
  const rows = await listDocuments(prisma, id)
  return NextResponse.json({ documents: rows })
}
