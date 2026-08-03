import { createHmac, timingSafeEqual } from 'node:crypto'

export function isPaymentsEnabled(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export function verifyPaymentSignature(input: {
  orderId: string
  paymentId: string
  signature: string
  secret: string
}): boolean {
  const expected = createHmac('sha256', input.secret).update(`${input.orderId}|${input.paymentId}`).digest('hex')
  return constantTimeEqual(expected, input.signature)
}

export function verifyWebhookSignature(input: { body: string; signature: string; secret: string }): boolean {
  const expected = createHmac('sha256', input.secret).update(input.body, 'utf8').digest('hex')
  return constantTimeEqual(expected, input.signature)
}

export interface PaymentOrder {
  id: string
  amountPaise: number
  currency: string
}

export async function createPaymentOrder(input: { amountPaise: number; receipt: string }): Promise<PaymentOrder> {
  if (!isPaymentsEnabled()) {
    return { id: `order_stub_${Date.now().toString(36)}`, amountPaise: input.amountPaise, currency: 'INR' }
  }
  const keyId = process.env.RAZORPAY_KEY_ID!
  const keySecret = process.env.RAZORPAY_KEY_SECRET!
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({ amount: input.amountPaise, currency: 'INR', receipt: input.receipt }),
  })
  if (!res.ok) {
    throw new Error(`Razorpay order creation failed: ${res.status}`)
  }
  const body = (await res.json()) as { id: string; amount: number; currency: string }
  return { id: body.id, amountPaise: body.amount, currency: body.currency }
}
