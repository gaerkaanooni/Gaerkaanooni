# 08 — Authentication & Access Control

Auth.js (NextAuth v5) with a credentials provider, JWT sessions, and role-based access control
enforced at both the page and API boundaries. See `packages/domain/src/roles.ts`,
`apps/web/src/auth.ts`, and `apps/web/src/lib/requireRole.ts`.

## 1. Roles

`ADMIN`, `INTERN`, `LAWYER`, `BACKER`, `PUBLIC`.

- Registration (`POST /api/register`) always creates `PUBLIC`.
- Staff promotion (`setRole`) is an admin action with an audit trail (`user.role-changed`).

## 2. Action matrix (`canPerform(role, action)`)

| Action | Allowed roles |
|---|---|
| `case.screen` | INTERN, LAWYER, ADMIN |
| `case.publish` | INTERN, LAWYER, ADMIN |
| `case.verify` | LAWYER, ADMIN |
| `case.dispatch` | LAWYER, ADMIN |
| `case.update` | INTERN, LAWYER, ADMIN |
| `case.refund` | ADMIN |
| `case.finalize` | ADMIN |
| `dashboard.view` | INTERN, LAWYER, ADMIN |
| `finance.view` | ADMIN |
| `volunteer.review` | ADMIN |
| `case.back`, `case.follow` | everyone (PUBLIC included) |

### 2.1 Volunteer-lawyer access path

Volunteer lawyers are **not** staff-login users. They authenticate through the public track
(email OTP / Google) and the `/volunteer` surfaces resolve their panel membership by matching the
verified session email against provisioned `Volunteer` rows (`src/lib/volunteer-session.ts`).
Approval of an application provisions a `User(role=LAWYER)` + `Volunteer` pair — an admin action,
consistent with §1 above. See 06-volunteers.md §5 for the full flow.

## 3. Enforcement layers

1. **Middleware** (`src/middleware.ts`) — guards `/dashboard` (redirect to `/login` for
   non-staff). The NextAuth edge build handles the JWT.
2. **Server pages** — the dashboard and analytics pages call `auth()` themselves and redirect, so
   the rule holds even if middleware is bypassed.
3. **API routes** — `requireRole(action)` in `src/lib/requireRole.ts` returns a 403 for denied
   callers; applied to `screen`, `publish`, and `updates`. It returns a discriminated union so route
   handlers always satisfy Next's `Response` return type.

## 4. Credentials & sessions

- Passwords hashed with bcryptjs (10 rounds); plaintext is never stored.
- JWT strategy embeds `role`; session callback exposes `session.user.id` and `session.user.role`.
- `AUTH_SECRET` is required in all environments (`.env.example`, CI, Playwright webServer).

## 5. Acceptance criteria

- An unauthenticated call to an internal API returns 403.
- A `PUBLIC` user redirected to `/dashboard` is sent back to `/login`.
- A `LAWYER` can screen/publish/verify but cannot refund or view analytics.
- Only `ADMIN` can refund, finalize, and view `finance.view` surfaces.
