# 12 — Analytics & Measurement

Status: implemented as an env-gated seam · no real keys configured (pre-launch) · events are no-op until `NEXT_PUBLIC_ANALYTICS_DSN` is set

## 1. Model

A single client-side seam in `apps/web/src/lib/analytics.ts`:

- `track(event)`: posts `{ event, properties, url, ts, uid }` to `NEXT_PUBLIC_ANALYTICS_DSN` via `fetch(keepalive)`.
- Env-gated: when `NEXT_PUBLIC_ANALYTICS_DSN` is unset, `track` is a **no-op** — so local dev and the offline test suite emit nothing.
- A stable per-browser anonymous id is stored in `localStorage` (`pil_analytics_uid`).
- Visitors can opt out (`pil_analytics_optout`); `analyticsOptedOut()` gate is respected by the pageview tracker.

Events are a fixed catalog (not freeform strings) so funnel analysis stays comparable.

## 2. Event catalog

| Event               | When                                                | Properties                                         |
|---------------------|-----------------------------------------------------|----------------------------------------------------|
| `pageview`          | Every route change                                  | `path`                                             |
| `view_campaign`     | Visitor opens a campaign page                       | `campaignId`                                       |
| `click_submit`      | Visitor clicks "Submit a case"                      | —                                                  |
| `submit_case`       | A case submission succeeds                          | `category`, `track`                                |
| `click_back`        | Visitor lands on the back/contribute flow           | `campaignId`                                       |
| `back_intent`       | Visitor starts a contribution                       | `campaignId`, `amountPaise`                        |
| `follow`            | Visitor follows a campaign                          | `campaignId`                                       |
| `refer_intent`      | Visitor opens the referral page                     | —                                                  |
| `referral_submitted`| A referral is submitted successfully                | `category`                                         |
| `signup_intent`     | Visitor starts signup                               | —                                                  |
| `signup_complete`   | A public (OTP/Google) signup completes              | `provider`                                         |
| `login_intent`      | Visitor starts login                                | —                                                  |
| `login_complete`    | A login completes                                   | `provider`                                         |

## 3. Funnel wiring (planned)

Wire the canonical public funnel end-to-end once real analytics keys are set:

1. `pageview` on `/` → `view_campaign` on a case → `click_back` → `back_intent` → payment success (add a `back_complete` event when capture finalizes).
2. Referral funnel: `refer_intent` → `referral_submitted`.
3. Case intake: `click_submit` → `submit_case`.

## 4. Integration (when going live)

- Set `NEXT_PUBLIC_ANALYTICS_DSN` to a PostHog/GA4-compatible ingestion endpoint in Vercel (and `.env.local`).
- Create dashboards for: funnel (visit→back→pay), referral volume, case-intake volume, activation (first contribution or first referral).
- Keep respect of the opt-out flag; do not send PII (contact fields are never read by analytics).

## 5. Acceptance criteria

- With `NEXT_PUBLIC_ANALYTICS_DSN` unset, no network telemetry fires; tests never touch analytics.
- With it set, `track` posts the documented envelope and does not throw on failure.
- Every documented event has at least one wiring point in the app (some already wired: `pageview`, `submit_case`, `referral_submitted`).
