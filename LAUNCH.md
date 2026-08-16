# Gaerkaanooni — Launch Runbook

Launch-ready baseline for PIL-promax (brand **Gaerkaanooni**): a platform to fund the legal matters people
are up against — a fair hearing shouldn't depend on what you can afford. This runbook takes an
already-green codebase to a live production deployment.

The code is **local-first and credentials-light**: the whole app builds, typechecks,
lints, tests (182 tests) and a production Next.js build passes with **zero** cloud
accounts — the Supabase integration runs a deterministic offline mock when its keys
are unset. Filling in the secrets below switches the real paths on.

> Timing: about 2–3 focused hours to provision, deploy and verify. Everything in
> this file is designed for the free tiers.

---

## 1. Current status

| Gate            | Status                                                         |
|-----------------|----------------------------------------------------------------|
| Typecheck       | ✅ `npm run typecheck`                                         |
| Lint            | ✅ `npm run lint`                                              |
| Tests           | ✅ 182 pass (`npm test`)                                        |
| Production build| ✅ `npm run build`                                              |
| Supabase auth   | ✅ Real email-OTP + Google (gated on env) / offline mock         |
| Doc storage     | ✅ `/api/cases/[id]/documents` private-bucket upload + signed URLs |
| Admin dashboard | ✅ `/dashboard` KPIs + `/dashboard/cases/[id]` document manager + referrals triage |
| DB migrations   | ✅ Prisma; `npm run db:deploy` applies to a hosted target        |
| Vercel hosting  | ✅ `vercel.json` baked in; deploy steps below                    |

---

## 2. Architecture

| Concern        | Provider          | Notes                                                        |
|----------------|-------------------|--------------------------------------------------------------|
| Database       | **Supabase Postgres** (recommended) *or* **Neon** | Prisma connects via `DATABASE_URL`; identical syntax for both. |
| Public auth    | Supabase Auth     | Email OTP + Google OAuth (`@supabase/ssr`), fallback mock.   |
| Staff auth     | Auth.js (unchanged)| Credentials + bcrypt, `pil_staff_session` cookie.            |
| Document storage| Supabase Storage  | Private `case-docs` bucket, `SUPABASE_SERVICE_ROLE_KEY`.     |
| Hosting        | Vercel            | Monorepo build outside `apps/web`; env-injected secrets.     |
| Tests          | Local Postgres    | `DATABASE_URL_TEST` → `pil_promax_test`, never a hosted DB.  |

**Why Supabase Postgres is the default and Neon is documented as the alternative:**
the platform already has a single provider (Supabase) doing Auth + Storage, and its
Postgres is free-tier. Pointing `DATABASE_URL` at Neon works identically (Prisma is
provider-agnostic) and is documented in §4.3 for teams that want Neon branching —
but keeping one vendor is the lowest-operational-risk launch default.

---

## 3. Prerequisites

- Node.js **20+** (CI uses 20; tooling warns on 22+ features for dsh only).
- Local Homebrew Postgres for dev/tests (`npm run test:db`).
- Accounts: **Supabase**, **Vercel**, and (optional) **Neon**.
- `npm install` at the repo root. If you see the dsh-react peer warning, install
  with `npm install --legacy-peer-deps` (the monorepo is pinned react 19 at root).

---

## 4. Provisioning

### 4.1 Database (Supabase Postgres — recommended)

1. [supabase.com](https://supabase.com) → New project. Pick a region. Note the
   **Database connection string** (Settings → Database → Connection string →
   "Connection pooling", use the pooler).
2. Copy the pooled URL to `DATABASE_URL` in `.env.local`.
3. Apply migrations:
   ```bash
   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres" \
     npm run db:deploy
   ```
   This runs `prisma migrate deploy` against the hosted DB.

### 4.2 Supabase Auth + Storage

1. **Email OTP provider**: Dashboard → Authentication → Providers → enable Email,
   set "Confirm email" = **Magic link / OTP**. (Free-tier emails the 6-digit code.)
2. **Google OAuth**: Authentication → Providers → Google, fill Client ID/Secret from
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
   Add the callback URL Supabase provides (origin `/auth/v1/callback`).
3. **Storage bucket**: Storage → New bucket → name `case-docs`, **Private**.
4. Copy keys (Dashboard → Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### 4.3 Alternative — Neon Postgres

1. [neon.tech](https://neon.tech) → New project. Copy the **pooled** connection string.
2. Set `DATABASE_URL` to the Neon pooled URL and run `npm run db:deploy`.
3. Auth remains Supabase (its own Postgres holds auth tables); the **application**
   schema lives on Neon. Keep `DATABASE_URL_TEST` pointing at local Postgres.

### 4.4 Razorpay (payments) — optional

Test-mode keys are in `.env.example`. Unless you already handle payment confirmations
server-side, leave `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` empty in production until
the webhook flow is live.

---

## 5. Secrets matrix

Copy `.env.example` → `.env.local` and fill. In Vercel, add the same entries as
environment variables (marking the non-`NEXT_PUBLIC_` ones as secret).

| Variable                       | Browser? | Vercel | Purpose                               |
|--------------------------------|----------|--------|---------------------------------------|
| `DATABASE_URL`                 | no       | yes    | Hosted Postgres pooled connection     |
| `DATABASE_URL_TEST`            | —        | no     | Local test DB only                    |
| `AUTH_SECRET`                  | no       | yes    | Auth.js staff session encryption      |
| `NEXT_PUBLIC_SUPABASE_URL`     | yes      | yes    | Supabase project URL                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| yes      | yes    | Public (anon) Supabase key            |
| `SUPABASE_SERVICE_ROLE_KEY`    | no       | yes    | Server-only Storage admin key         |
| `SUPABASE_STORAGE_BUCKET`      | no       | yes    | Bucket name (`case-docs`)             |
| `RAZORPAY_KEY_ID/SECRET`       | no       | yes*   | Optional, server-only payment keys    |
| `DEEPSEEK_API_KEY`             | no       | no     | dsh agent loops only, not production  |

> Add a `NEXTAUTH_URL` / `AUTH_URL` equal to your Vercel production URL so Auth.js
> callback URLs build correctly.

---

## 6. Vercel deployment

1. Push `main` to GitHub (the repo has an upstream remote at
   `https://github.com/Anmoldureha/PIL-promax`).
2. [vercel.com](https://vercel.com) → New Project → import the GitHub repo.
3. **Root directory:** `/` (the `vercel.json` in the repo pins build command
   `npm run build` and output `.next` for the monorepo).
4. Add all env vars from §5.
5. Build setting: **Framework Preset = Next.js**. Leave the rest default.
6. First deploy: run `npm run db:deploy` with the production `DATABASE_URL` **before**
   or immediately after, so Prisma tables exist. (Or use a Build step that runs
   `prisma migrate deploy` before `next build` — see §7 note on migrations.)
7. Production URL from the project dashboard; set `AUTH_URL` to it if needed.

### First-sign-in note

Until you create a staff user in the deployed DB, `/login/staff` can't authenticate.
Options: `npm run db:seed --workspace @pil/db` (local) against the hosted URL, or
register via `/register` and promote the role with a one-off script using
`setRole`. Never ship default credentials.

---

## 7. CI / adopt

`.github/workflows/ci.yml` runs typecheck, lint, `npm test`, and Playwright e2e on
every push/PR against a Github-hosted Postgres. The production web build is run by
Vercel on deploy. CI **does not** need Supabase/Neon secrets.

Two production gaps to close before launch day:

1. **Migrations in deploy**: either add a Vercel "build command" that runs
   `prisma migrate deploy` first, or adopt a tiny GitHub Action that applies
   `npm run db:deploy` after merge to `main`. Choose a single owner to avoid
   double-applying.
2. **Playwright e2e in CI** needs either the Supabase mock (already gated on env) or
   ephemeral real credentials. It currently runs against the local Postgres + mock —
   keep it that way.

---

## 8. Local dev after wiring secrets

```bash
cp .env.example .env.local   # then fill real values
npm install --legacy-peer-deps
npm run dev                  # http://localhost:3000
```

- **With Supabase keys set**: login uses live email OTP + Google; documents use the
  private bucket.
- **Without keys**: the offline mock shows the dev OTP code on the login card; hidden
  feature works. This is exactly what makes CI and demos reproducible.

### Verify auth off/on

```bash
# mock (no keys)
curl -s localhost:3000/api/health

# real (keys in .env.local): request an OTP, the code arrives by email
curl -sX POST localhost:3000/api/public-auth/otp -H 'content-type: application/json' \
  -d '{"email":"you@example.com"}'
```

---

## 9. Admin dashboard

| Route                 | Who      | What                                             |
|-----------------------|----------|--------------------------------------------------|
| `/`                   | public   | Docket hero, "how it works", money honesty      |
| `/refer`              | public   | Dignity-first referral intake (account-free)     |
| `/submit`             | public   | Submit a legal matter for screening              |
| `/dashboard`          | staff    | KPIs + cases + volunteers + referrals triage     |
| `/analytics`          | ADMIN    | Operational analytics (money, conversion, categories) |
| `/dashboard/cases/[id]`| staff   | Case document manager (upload / list / download / delete; staff-only, private storage) |

The middleware guards `/dashboard*` by Auth.js staff session; document routes and the
referral list are individually RBAC-checked (`requireRole`). Referral intake (`/api/referrals`)
is intentionally open — someone referring another person's matter should not need an account.

---

## 10. Launch checklist

- [ ] `npm run typecheck && npm run lint && npm test && npm run build` all green.
- [ ] Supabase project created; `DATABASE_URL` set; `npm run db:deploy` applied; Prisma client regenerated.
- [ ] Email OTP + Google OAuth enabled in Supabase; callback URLs configured.
- [ ] `case-docs` private bucket created.
- [ ] `.env.local` full with real values; nothing committed (`.gitignore` covers `.env*`).
- [ ] Vercel project imported, root `/`, env vars set, `AUTH_URL` correct.
- [ ] First deploy succeeds; `/api/health` returns 200.
- [ ] Create the first staff ADMIN in the deployed DB.
- [ ] Smoke test: email OTP sign-in, Google sign-in, staff dashboard, upload a doc + download via signed URL.
- [ ] Referral smoke: submit a matter on `/refer`, see it in the staff dashboard, advance its status.
- [ ] Migrations-on-deploy ownership decided and implemented.
- [ ] Razorpay live keys + webhook configured (or payments disabled clearly).
- [ ] Privacy/legal page live; document bucket access confirmed private.

---

## 11. Cost

All services above are free-tier: Supabase Hosted (500 MB DB, 1 GB storage, email
auth), Vercel Hobby (0 cost), Neon free tier if used. Expect ₹0 until traffic grows.
