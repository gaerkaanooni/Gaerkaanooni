/**
 * Shared zero-dependency constants.
 *
 * Kept free of any heavy imports so Edge-safe modules (middleware) can use them
 * without pulling server-only graphs (Prisma, Supabase admin) past the 1 MB
 * Edge Function size cap.
 */

/** Signed mock staff-session cookie name (offline mode). */
export const STAFF_SESSION_COOKIE = 'pil_staff_session'

/** Signed mock public-session cookie name (offline mode). */
export const PUBLIC_SESSION_COOKIE = 'pil_session'
