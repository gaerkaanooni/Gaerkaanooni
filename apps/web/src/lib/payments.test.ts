import { describe, expect, it } from 'vitest'
import { createHmac } from 'node:crypto'
import { isPaymentsEnabled, verifyPaymentSignature, verifyWebhookSignature } from './payments'

const SECRET = 'test-secret'

function hmac(input: string) {
  return createHmac('sha256', SECRET).update(input).digest('hex')
}

describe('verifyPaymentSignature', () => {
  it('accepts a valid payment signature', () => {
    const orderId = 'order_abc'
    const paymentId = 'pay_xyz'
    const signature = hmac(`${orderId}|${paymentId}`)
    expect(verifyPaymentSignature({ orderId, paymentId, signature, secret: SECRET })).toBe(true)
  })

  it('rejects a tampered signature', () => {
    const signature = hmac('order_abc|pay_xyz')
    expect(verifyPaymentSignature({ orderId: 'order_abc', paymentId: 'pay_OTHER', signature, secret: SECRET })).toBe(false)
    expect(verifyPaymentSignature({ orderId: 'order_abc', paymentId: 'pay_xyz', signature: 'deadbeef', secret: SECRET })).toBe(
      false,
    )
  })
})

describe('verifyWebhookSignature', () => {
  it('accepts a valid webhook body signature', () => {
    const body = '{"event":"payment.captured"}'
    const signature = hmac(body)
    expect(verifyWebhookSignature({ body, signature, secret: SECRET })).toBe(true)
  })

  it('rejects a body that was altered after signing', () => {
    const signature = hmac('{"event":"payment.captured"}')
    expect(verifyWebhookSignature({ body: '{"event":"payment.failed"}', signature, secret: SECRET })).toBe(false)
  })
})

describe('isPaymentsEnabled', () => {
  it('is disabled when no keys are configured', () => {
    const prevId = process.env.RAZORPAY_KEY_ID
    const prevSecret = process.env.RAZORPAY_KEY_SECRET
    delete process.env.RAZORPAY_KEY_ID
    delete process.env.RAZORPAY_KEY_SECRET
    expect(isPaymentsEnabled()).toBe(false)
    if (prevId) process.env.RAZORPAY_KEY_ID = prevId
    if (prevSecret) process.env.RAZORPAY_KEY_SECRET = prevSecret
  })
})
