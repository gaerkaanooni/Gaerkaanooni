import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CASE_DOCS_BUCKET, isSupabaseConfigured } from './env'

/**
 * Server-only Supabase Storage access for case documents.
 *
 * Always uses the `service_role` key, which bypasses RLS and Storage policies, so
 * it must ONLY ever be called from the server (Route Handlers / Server Actions).
 * The key is never exposed to the browser bundle.
 *
 * Documents live in the private `case-docs` bucket. Uploads store the object with
 * a deterministic (case-scoped, idempotent) path; downloads are served via short
 * lived signed URLs so bytes never pass through unsigned public reads and expire
 * after a few minutes.
 */

let adminClient: SupabaseClient | null = null

function admin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }
  if (!adminClient) {
    adminClient = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return adminClient
}

export function isStorageConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(SUPABASE_SERVICE_ROLE_KEY)
}

/** Build an idempotent object path for a case + uploaded file. */
export function storagePathFor(caseId: string, fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, '_')
  return `${caseId}/${Date.now()}_${safeName}`
}

export interface UploadResult {
  storagePath: string
  [k: string]: unknown
}

/** Server-side upload of a file Buffer to the private `case-docs` bucket. */
export async function uploadCaseDocument(args: {
  caseId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}): Promise<UploadResult> {
  const path = storagePathFor(args.caseId, args.fileName)
  const { error } = await admin().storage.from(CASE_DOCS_BUCKET).upload(path, args.buffer, {
    contentType: args.mimeType,
    upsert: false,
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return { storagePath: path }
}

/** Return a short-lived (10 min) signed download URL for an object, or null. */
export async function signedDownloadUrl(storagePath: string): Promise<string | null> {
  if (!isStorageConfigured()) return null
  const { data, error } = await admin()
    .storage.from(CASE_DOCS_BUCKET)
    .createSignedUrl(storagePath, 10 * 60)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/** Delete an object from the bucket (also removes from Storage; row handled by Prisma). */
export async function deleteCaseDocument(storagePath: string): Promise<void> {
  const { error } = await admin().storage.from(CASE_DOCS_BUCKET).remove([storagePath])
  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
