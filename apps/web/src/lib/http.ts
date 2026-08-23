import { NextResponse } from 'next/server'

/**
 * Safe helpers for Route Handlers.
 *
 * The biggest "500 on bad input" source in this app is `await request.json()`
 * throwing on a malformed or non-JSON body. `parseJsonBody` turns that into a
 * clean 400 instead, and `asRecord` coerces unknown input to a plain object so
 * downstream code never receives `null`, arrays, or primitives unexpectedly.
 */

export type JsonBodyError = { error: string }

/** Parse a JSON body safely. On failure, returns null (and you can emit `badRequest`). */
export async function parseJsonBody(
  request: Request,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { ok: false, response: badRequest('Invalid JSON body') }
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, response: badRequest('Request body must be a JSON object') }
  }
  return { ok: true, body: raw as Record<string, unknown> }
}

/** Standard 400 JSON response. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}

/** Read a field as a trimmed string (default to fallback or ''). */
export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Read a field as a boolean. */
export function bool(value: unknown): boolean {
  return value === true
}

/** Read a field as a trimmed nullable string. */
export function nullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
