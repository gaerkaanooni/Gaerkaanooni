import { NextResponse } from 'next/server'
import { captureContribution, prisma } from '@pil/db'
import { DomainError } from '@pil/domain'
import { isPaymentsEnabled, verifyPaymentSignature } from '@/lib/payments'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json()
    const contributionId: string = body.contributionId

    const contrib = await prisma.contribution.findUnique({ where: { id: contributionId } })
    if (!contrib || contrib.caseId !== id) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 })
    }

    if (isPaymentsEnabled()) {
      if (!body.paymentId || !body.signature || !contrib.razorpayOrderId) {
        return NextResponse.json({ error: 'Payment proof is required' }, { status: 400 })
      }
      const valid = verifyPaymentSignature({
        orderId: contrib.razorpayOrderId,
        paymentId: body.paymentId,
        signature: body.signature,
        secret: process.env.RAZORPAY_KEY_SECRET!,
      })
      if (!valid) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
      }
    }

    await captureContribution(prisma, { contributionId, gatewayFeePaise: 0 })
    return NextResponse.json({ ok: true, status: 'CAPTURED' })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
