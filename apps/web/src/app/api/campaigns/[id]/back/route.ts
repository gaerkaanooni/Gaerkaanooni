import { NextResponse } from 'next/server'
import { backCase, prisma } from '@pil/db'
import { DomainError } from '@pil/domain'
import { createPaymentOrder, isPaymentsEnabled } from '@/lib/payments'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json()
    const contrib = await backCase(prisma, {
      caseId: id,
      backerId: 'anonymous',
      grossAmountPaise: body.grossAmountPaise,
      gatewayFeePaise: 0,
    })

    let razorpayOrderId: string | null = null
    if (isPaymentsEnabled()) {
      const order = await createPaymentOrder({ amountPaise: contrib.grossAmountPaise, receipt: `contrib_${contrib.id}` })
      razorpayOrderId = order.id
      await prisma.contribution.update({ where: { id: contrib.id }, data: { razorpayOrderId } })
    }

    return NextResponse.json(
      {
        id: contrib.id,
        status: contrib.status,
        razorpayOrderId,
        amountPaise: contrib.grossAmountPaise,
        currency: 'INR',
        razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? null,
      },
      { status: 201 },
    )
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
