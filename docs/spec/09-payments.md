# 09 — Payments (Razorpay) & Webhooks

Real payment capture in live mode, a deterministic stub in dev/test. See
`apps/web/src/lib/payments.ts` and the `back`, `back/confirm`, and `razorpay/webhook` routes.

## 1. Modes

| Mode | Trigger | Behavior |
|---|---|---|
| Live | `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` set | Creates a real order at `api.razorpay.com/v1/orders`, opens Checkout.js, verifies HMAC signatures. |
| Stub | keys absent (default in dev/CI) | `back` returns `razorpayOrderId: null`; `back/confirm` captures directly. Gives a deterministic end-to-end money path without network or credentials. |

## 2. Flow

1. `POST /api/campaigns/[id]/back` — validates and creates a `PENDING` contribution, then (live
   only) creates a Razorpay order (`receipt = contrib_<id>`) and stores `razorpayOrderId`. Returns
   the order id, amount, and `razorpayKeyId` for checkout.
2. Client `BackForm`:
   - Stub → calls `back/confirm` immediately.
   - Live → loads Checkout.js, opens the order; the success handler posts the `payment_id` and
     `signature` to `back/confirm`.
3. `POST /api/campaigns/[id]/back/confirm` — live mode requires `paymentId` + `signature` and
   verifies `HMAC-SHA256(orderId|paymentId)` with the key secret; then `captureContribution`.
4. `POST /api/razorpay/webhook` — verifies the `X-Razorpay-Signature`
   (`HMAC-SHA256(rawBody)`, constant-time), and on `payment.captured` looks up the contribution by
   `razorpayOrderId` and captures it. Belt-and-braces for gateway-initiated confirmations.

## 3. Money rules on capture

`captureContribution` recomputes the fee split with the real gateway fee, writes the ledger entry,
and — for a funded-track `LIVE` case — evaluates the threshold and flips to `FUNDED` when met.
Dispatched-track backs replenish the response fund instead.

## 4. Signature verification

- `verifyPaymentSignature({ orderId, paymentId, signature, secret })` — checkout path.
- `verifyWebhookSignature({ body, signature, secret })` — webhook path.
- Both use constant-time comparison. Tested with known HMAC vectors.

## 5. Acceptance criteria

- In stub mode, a back → confirm produces a `CAPTURED` contribution with no keys configured.
- In live mode, a confirm with a valid signature captures; a tampered signature is rejected 400.
- The webhook rejects requests with a missing or invalid signature.
- Capturing the final pledge past the goal flips the case to `FUNDED`.
