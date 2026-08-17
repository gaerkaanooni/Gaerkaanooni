# Deploy to Vercel — the short answer

> Full walkthrough lives in [`LAUNCH.md`](LAUNCH.md). This is the quick reference
> for **what to push** and **which keys go where**. Everything here is free-tier.

## What gets deployed (push to `main`)

Only **source code** goes to GitHub/Vercel. Secrets never live in the repo — they are
injected at build/runtime. `vercel.json` at the repo root already pins the monorepo
build (`npm run build`, output `.next`). So:

- Push the whole repo to `main` (`origin` = `https://github.com/gaerkaanooni/Gaerkaanooni`).
- Vercel imports that repo, root directory `/`, Framework Preset **Next.js**.
- Vercel's build runs `npm run build` → then Next serves the routes. New routes you'll
  notice live: `/api/cases/[id]/documents`, `/api/public-auth/google/callback`,
  `/dashboard`, `/dashboard/cases/[id]`, `/analytics`, `/refer`, `/api/referrals`,
  plus `/icon.svg`, `/opengraph-image`, `/apple-icon`.

> Your **local `.env.local`, `package-lock.json` node_modules, `.next`** are NOT pushed
> (gitignored). Only tracked source files deploy.

## First build will fail auth until keys exist — that's normal

`next build` reads `apps/web/.env.local`. If it's missing, the build still succeeds
(the Supabase paths are gated off), but your real sign-in will be the offline mock.
To run the real stack, mirror all production keys into Vercel (below).

---

## Where each key goes

### ⇒ Put these in **Vercel** (Project → Settings → Environment Variables)

| Key | Browser-exposed? | Source / where to get it | Required? |
|-----|------------------|--------------------------|-----------|
| `DATABASE_URL` | no | Supabase → Settings → Database → "Connection pooling" URI (or your Neon pooled URI) | ✅ |
| `AUTH_SECRET` | no | `openssl rand -base64 32` (generate once) | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → Settings → API (`https://<ref>.supabase.co`) | ✅ for real auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase → Settings → API → **anon / public** key | ✅ for real auth |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Supabase → Settings → API → **service_role** key | ✅ for doc upload |
| `SUPABASE_STORAGE_BUCKET` | no | your bucket name, default `case-docs` | ✅ for doc upload |
| `NEXT_PUBLIC_SITE_URL` | no | your production URL, e.g. `https://gaerkaanooni.vercel.app` (also set `AUTH_URL`/`NEXTAUTH_URL` = same) | ✅ for social/OG + Auth.js |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | no | Razorpay dashboard | only when payments go live |

Mark every **non-`NEXT_PUBLIC_`** variable as **secret** in Vercel and add them for
**Production** (and Preview if you want preview deploys to use the real stack).

### ⇒ Put these in local **`.env.local`** only (never commit)

Same set as Vercel (so local dev uses the real stack), plus:
- `DATABASE_URL_TEST` → local Postgres `pil_promax_test` (tests only, never a hosted DB).
- `DEEPSEEK_API_KEY` → dsh agent loops only; not needed for the web app.

---

## The one manual cloud step: migrate the DB before/right after first deploy

```bash
# from repo root, with DATABASE_URL set to your hosted Postgres:
DATABASE_URL="postgresql://YOUR_HOSTED_URL" npm run db:deploy
```

This runs `prisma migrate deploy` so the `CaseDocument` (and all) tables exist on
Supabase/Neon. If you skip it, the deployed app hits "table does not exist."

---

## Also in Supabase (console, not deployment)

1. **Email OTP** provider on (free tier emails the 6-digit code).
2. **Google OAuth** configured (Client ID/Secret from Google Cloud Console) + callback URL.
3. **Storage bucket** `case-docs` created as **Private**.
4. Create your first **staff ADMIN** in the deployed DB (register then promote via
   `setRole`, or a seed script) — otherwise `/login/staff` has no account.

---

## Verification

- `GET https://<your-app>/api/health` → `200`.
- Sign in with email OTP → email arrives.
- `/dashboard` loads for a staff account; upload a PDF to a case → download link works.
- `npm run typecheck && npm run lint && npm test && npm run build` → green locally.

If you still need pointers to the exact dashboards/keys in Supabase, the annotated
runbook is `LAUNCH.md`.
