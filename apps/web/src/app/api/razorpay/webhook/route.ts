import { NextResponse } from 'next/server'
import { captureContribution, prisma } from '@pil/db'
import { DomainError } from '@pil/domain'
import { isPaymentsEnabled, verifyWebhookSignature } from '@/lib/payments'

interface RazorpayWebhook {
  event: string
  payload?: {
    payment?: {
      entity?: {
        id?: string
        order_id?: string | null
        amount?: number
      }
    }
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!isPaymentsEnabled()) {
    return NextResponse.json({ error: 'Payments are not configured' }, { status: 400 })
  }
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }
  const valid = verifyWebhookSignature({
    body: rawBody,
    signature,
    secret: process.env.RAZORPAY_KEY_SECRET!,
  })
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const event = JSON.parse(rawBody) as RazorpayWebhook
    if (event.event !== 'payment.captured') {
      return NextResponse.json({ ok: true })
    }
    const orderId = event.payload?.payment?.entity?.order_id
    if (!orderId) {
      return NextResponse.json({ ok: true })
    }

    const contrib = await prisma.contribution.findFirst({ where: { razorpayOrderId: orderId } })
    if (!contrib) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 })
    }
    await captureContribution(prisma, { contributionId: contrib.id, gatewayFeePaise: 0 })
    return NextResponse.json({ ok: true, status: 'CAPTURED' })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
