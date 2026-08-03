import { NextResponse } from 'next/server'
import { defaultConfig } from '@pil/domain'

export function GET() {
  return NextResponse.json({
    ok: true,
    feePercent: defaultConfig.platformFeePercent,
  })
}
