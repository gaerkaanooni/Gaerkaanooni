import type { PrismaClient } from '@prisma/client'

export interface CaseDocumentRow {
  id: string
  caseId: string
  storagePath: string
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  uploadedById: string | null
  createdAt: Date
}

/**
 * Prisma access to `CaseDocument` metadata rows. Bytes live in Supabase Storage
 * (`case-docs` private bucket); `storagePath` is the object key that ties them.
 */

export interface CreateDocumentInput {
  caseId: string
  storagePath: string
  fileName: string
  mimeType?: string | null
  sizeBytes?: number | null
  uploadedById?: string | null
}

export async function createDocument(db: PrismaClient, input: CreateDocumentInput): Promise<CaseDocumentRow> {
  return db.caseDocument.create({
    data: {
      caseId: input.caseId,
      storagePath: input.storagePath,
      fileName: input.fileName,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
      uploadedById: input.uploadedById ?? null,
    },
  })
}

export async function listDocuments(db: PrismaClient, caseId: string): Promise<CaseDocumentRow[]> {
  return db.caseDocument.findMany({
    where: { caseId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getDocument(db: PrismaClient, id: string): Promise<CaseDocumentRow | null> {
  return db.caseDocument.findUnique({ where: { id } })
}

export async function deleteDocument(db: PrismaClient, id: string): Promise<void> {
  await db.caseDocument.delete({ where: { id } })
}
