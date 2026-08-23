# ADR-001 — Unify all auth on Supabase

Status: **Implemented (offline/mock path done & verified); live Supabase path is a thin shim awaiting real keys** · Updated after execution

## Context

Gaerkaanooni currently has **two auth providers**:

1. **Public users** (backers, submitters, referrers) — **Supabase Auth** (email OTP + Google), gated
   on `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, with a deterministic offline mock
   in `apps/web/src/lib/mock-supabase.ts` when keys are unset. Session handled by `@supabase/ssr`
   (`lib/supabase/server.ts`, `browser.ts`, `middleware.ts`).
2. **Staff** (INTERN / LAWYER / ADMIN) — **Auth.js** `Credentials` provider
   (`apps/web/src/auth.ts`), bcrypt password in `User.passwordHash`, JWT in the `pil_staff_session`
   cookie, guarded by `middleware.ts` and `requireRole` in ~10 routes.

We want **one auth provider** (Supabase) for everyone, while keeping the staff/ADMIN role model (Supabase
Auth has no roles) and an offline mock so tests and local dev still work without real keys.

## Decision (implemented)

**Auth.js is removed.** All auth now flows through one unified server-side module,
`apps/web/src/lib/auth-session.ts`:

- **Public** — Supabase email-OTP + Google (unchanged), gated on Supabase keys with an offline mock.
- **Staff** — **Supabase email + password** (`signInWithPassword`), resolving the staff `Role` from the
  Prisma `User` row by email. Offline, the mock verifies against the bcrypt `passwordHash` and writes a
  signed `pil_staff_session` cookie. Both modes share the same `getStaffSession()`/`signInStaff()`
  surface, so the live path is a thin shim over the already-tested code.
- Files replaced: `auth.ts` (deleted), `api/auth/[...nextauth]/route.ts` (deleted),
  `types/next-auth.d.ts` (deleted); `next-auth` dependency removed.
- New: `lib/auth-session.ts`, `api/staff/login`, `api/staff/logout`. `requireRole`, dashboard/analytics
  pages, layout, middleware, Nav sign-out all switched to the unified session. `bcryptjs` + the
  `User.passwordHash` column are retained as the offline-mock credential check.
- Verified offline (this repo's local DB): staff login with `admin@pilpromax.org`
  (`seed-pass-123`) returns `{role: "ADMIN"}` and grants `/dashboard` (200).

### What remains (live-validation, needs real keys)
No live Supabase project exists, so the real `signInWithPassword` call + session cookie path is not
executed here — it is gated behind the same `isSupabaseConfigured()` branch and should be smoke-tested
once keys are provisioned. No further code change is expected.

## Target architecture (when executed)

### Auth flows
- **Public** — unchanged: Supabase email OTP + Google via `@supabase/ssr`.
- **Staff** — Supabase email OTP (or email+password via Supabase), with `Role` resolved from the Prisma
  `User` row by email. Remove the Auth.js `Credentials` provider and the `pil_staff_session` cookie.
- Offline: extend `mock-supabase.ts` to also serve staff OTP (same deterministic mock), and keep the
  `User.passwordHash` column for backward compatibility (no longer used for login).

### Code touchpoints (exact)
- `apps/web/src/auth.ts` — remove `NextAuth(...)`; replace with a thin staff session helper that calls
  Supabase (or the mock) and reads `User.role` from Prisma.
- `apps/web/src/middleware.ts` — drop `getToken`/Auth.js decode; read the staff role from the shared
  Supabase session + Prisma role lookup (server-only; not in edge if it needs Prisma — use a route-level
  guard instead).
- `apps/web/src/lib/requireRole.ts` — resolve role from Prisma by the session user's email.
- Routes: `api/auth/[...nextauth]/route.ts` (remove), `api/campaigns/[id]/publish|screen|updates`,
  `api/referrals`, `api/cases/[id]/documents`, `api/health` (if it reads auth).
- Pages: `dashboard/page.tsx`, `dashboard/cases/[id]/page.tsx`, `analytics/page.tsx`, `layout.tsx`.
- Components: `Nav.tsx`, `LoginForm.tsx` (emails OTP not password+signIn).
- Tests: `auth.test.tsx` (mocks `next-auth/react`), `login-gate.test.tsx`.
- Deps: remove `next-auth`, `@auth/core` from `apps/web/package.json`.

### Steps to execute (run with real keys)
1. Provision a Supabase project; enable email OTP + Google.
2. Seed/promote staff users: `registerUser` then `setRole` to INTERN/LAWYER/ADMIN (keep the bcrypt
   passwordHash field, or drop it once login is fully Supabase).
3. Build `lib/supabase/staffAuth.ts` (login via Supabase + read `User.role`).
4. Migrate the touchpoints above; delete the Auth.js files.
5. Run `npm run typecheck && npm run lint && npm test && npm run build` with keys set (real path) and
   unset (mock path).

## Consequences
- One auth provider for the whole platform when live.
- Staff dashboard requires a live Supabase session (or the offline mock) — no separate Auth.js secret.
- Slightly more work up front; fully removable Auth.js + `AUTH_SECRET` env once staff is on Supabase.
