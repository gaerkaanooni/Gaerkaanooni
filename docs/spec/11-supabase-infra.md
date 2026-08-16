# 11 — Supabase + Vercel Infrastructure (free tier)

Status: implemented (offline mock default; real integration gated on env keys) · Cost assumptions: ₹0 (all tiers below are Supabase Hosted free / Vercel Hobby)

> Runbook: see [`LAUNCH.md`](../../LAUNCH.md) for provisioning, secrets, deployment and the
> launch checklist. Section 2 note: `DATABASE_URL` is provider-agnostic — Supabase Postgres is the
> default, Neon is an equivalent alternative (see §4.3 of LAUNCH.md).

## 1. Goal

Run the whole platform on free tiers: **Supabase** for Postgres, Auth, and Storage, and **Vercel**
for the Next.js app. Keep local Postgres only for the fast unit/story test suite
(`pil_promax_test`) and offline-first local dev where Supabase is unreachable.

## 2. Architecture

| Concern        | Provider            | Notes                                                                 |
|----------------|---------------------|-----------------------------------------------------------------------|
| Database       | Supabase Postgres   | Prisma connects via `DATABASE_URL` (pooled). Managed schema below.    |
| Auth (public)  | Supabase Auth       | Email OTP (magic code) + Google OAuth. Sessions via `@supabase/ssr`.  |
| Auth (staff)   | Auth.js (unchanged) | Credentials + bcrypt; `pil_staff_session`. Move later (needs service-role key). |
| Storage        | Supabase Storage    | Private bucket `case-docs` for petitions/orders; server-side uploads. |
| Hosting        | Vercel (Hobby)      | Monorepo build outside `apps/web`; env-injected secrets.             |
| Tests          | Local Postgres      | `DATABASE_URL_TEST` → `pil_promax_test`, never Supabase.             |

## 3. Why email OTP, not phone SMS

Supabase free tier sends email OTP at no cost. Phone (SMS) OTP requires a Twilio account
(paid) and a verified sender. The public login therefore switches from the phone-based mock to
**email OTP** (primary) and **Google OAuth** (secondary). No donor-facing phone field is kept.

## 4. Auth design (public)

- `Packages/auth` seam stays: `isSupabaseConfigured()` gated on
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without them, the deterministic
  mock (dev/test) still works; e2e against the local test DB uses the mock and needs no real email.
- Real path (keys present):
  - Request: `supabase.auth.signInWithOtp({ email })` → Supabase emails a 6-digit code.
  - Verify: `supabase.auth.verifyOtp({ email, token, type: 'email' })` → session.
  - Google: `supabase.auth.signInWithOAuth({ provider: 'google' })` → redirect + callback.
- `supabase.signIn()` upserts a `User` row (role PUBLIC/BACKER by email) server-side so the
  Prisma side of the app can keep associating backers/contributions.
- Nav + server components read the session via a Supabase SSR server client (`getUser()`);
  on the redirect from Google the callback sets the auth cookie with the session.

## 5. Database management

- Schema is versioned by Prisma migrations in `packages/db/prisma/migrations`. Apply to Supabase
  with `prisma migrate deploy` (creates the Prisma bookkeeping tables correctly).
- Future schema changes: `prisma migrate dev --name <x>` locally, then `migrate deploy` to
  Supabase (or via the Supabase MCP with the equivalent DDL when remote-only).
- Seed: local-only helper against the dev URL; do **not** seed production data into any
  donor-facing Supabase env by default.

## 6. Storage (case documents)

- Bucket `case-docs` (private). Server-side uploads via the Storage admin API using a
  `SUPABASE_SERVICE_ROLE_KEY` (not present in browser bundles).
- Route `POST /api/cases/[id]/documents` uploads and writes a `CaseDocument` row; unauthenticated
  or non-staff clients are rejected. Download serves via signed URLs (10-min expiry).
- Free tier: 1 GB.

## 7. Vercel deployment

- `vercel.json` pins the root directory + build command for the monorepo.
- Env injected at deploy time: `DATABASE_URL` (Supabase pooled), `AUTH_SECRET`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  optional `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`.
- Note: Vercel Hobby functions are limited in duration/memory; long-running Prisma operations are
  fine at this scale.

## 8. Secrets matrix

| Secret | Where | Public? |
|---|---|---|
| `DATABASE_URL` | .env.local · Vercel env | no |
| `AUTH_SECRET` | .env.local · Vercel env | no |
| `NEXT_PUBLIC_SUPABASE_URL` | .env.local · Vercel env | yes (browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | .env.local · Vercel env | yes (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only env (Vercel secret) | no |
| `RAZORPAY_KEY_ID/SECRET` | optional, server-only | behind key: no |

## 9. Acceptance criteria

- `prisma migrate deploy` succeeds against Supabase and the app serves from it with `DATABASE_URL`
  pointing at Supabase.
- Unit + story tests run against local `pil_promax_test` without touching Supabase or the network.
- With `NEXT_PUBLIC_SUPABASE_*` unset, the login flow runs the deterministic mock and the full
  e2e suite passes locally.
- With keys set, a user can request an email OTP (or Google) and the sign-in attaches a session;
  a `User` row (role PUBLIC/BACKER) is upserted.
- `POST /api/cases/[id]/documents` rejects non-staff, stores files server-side in `case-docs`,
  and returns a signed URL for download.
- Staff auth is untouched by this change; `pil_staff_session` still works.