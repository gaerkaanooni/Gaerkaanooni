'use client'

import Link from 'next/link'
import { useState } from 'react'
import { track } from '@/lib/analytics'

interface RazorpayCheckout {
  open: () => void
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_signature: string
}

const METHODS = ['UPI', 'Card', 'Netbanking'] as const
type Method = (typeof METHODS)[number]
type Step = 'amount' | 'checkout' | 'processing' | 'done' | 'error'

const PLATFORM_FEE_PERCENT = 5
const QUICK_AMOUNTS = [100, 250, 500, 1000, 2500] as const

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).Razorpay) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load the payment gateway'))
    document.body.appendChild(script)
  })
}

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`

export default function BackForm({ campaignId }: { campaignId: string }) {
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<Step>('amount')
  const [method, setMethod] = useState<Method>('UPI')
  const [contributionId, setContributionId] = useState('')
  const [grossPaise, setGrossPaise] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const feePaise = Math.floor((grossPaise * PLATFORM_FEE_PERCENT) / 100)
  const netPaise = grossPaise - feePaise

  async function confirmPayment(id: string, payment?: { paymentId: string; signature: string }) {
    const res = await fetch(`/api/campaigns/${campaignId}/back/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contributionId: id, ...(payment ?? {}) }),
    })
    if (!res.ok) throw new Error('Payment confirmation failed')
    return res.json()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const rupees = Number(amount)
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setError('Enter a positive amount in rupees')
      setStep('error')
      return
    }
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/back`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grossAmountPaise: Math.round(rupees * 100), gatewayFeePaise: 0 }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Backing failed')

      setContributionId(body.id)
      setGrossPaise(body.amountPaise ?? Math.round(rupees * 100))
      void track({ name: 'back_intent', props: { campaignId, amountPaise: Math.round(rupees * 100) } })

      if (!body.razorpayOrderId) {
        setStep('checkout')
        return
      }

      await loadRazorpayScript()
      const Rzp = (window as unknown as { Razorpay: new (options: object) => RazorpayCheckout }).Razorpay
      const rzp = new Rzp({
        key: body.razorpayKeyId,
        amount: body.amountPaise,
        currency: body.currency ?? 'INR',
        name: 'Gaerkaanooni',
        order_id: body.razorpayOrderId,
        handler: async (response: RazorpayResponse) => {
          await confirmPayment(body.id, {
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
          setStep('done')
        },
        modal: { ondismiss: () => setStep('amount') },
      })
      rzp.open()
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('error')
    } finally {
      setBusy(false)
    }
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStep('processing')
    await new Promise((resolve) => setTimeout(resolve, 700))
    try {
      await confirmPayment(contributionId)
      setStep('done')
    } catch {
      setError('The payment could not be confirmed. Please try again.')
      setStep('error')
    }
  }

  const reset = () => {
    setStep('amount')
    setAmount('')
    setContributionId('')
    setGrossPaise(0)
    setError('')
  }

  if (step === 'checkout') {
    return (
      <div className="checkout">
        <p className="checkout-title">Confirm your payment</p>
        <div className="checkout-summary">
          <div className="checkout-row">
            <span>Pledge</span>
            <strong>{inr(grossPaise)}</strong>
          </div>
          <div className="checkout-row muted">
            <span>Platform fee (5%)</span>
            <span>− {inr(feePaise)}</span>
          </div>
          <div className="checkout-row net">
            <span>Reaches the case</span>
            <strong>{inr(netPaise)}</strong>
          </div>
        </div>

        <p className="checkout-label">Pay with</p>
        <div className="methods">
          {METHODS.map((m) => (
            <label key={m} className={`method ${method === m ? 'selected' : ''}`}>
              <input
                type="radio"
                name="method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
              />
              <span>{m}</span>
            </label>
          ))}
        </div>

        <p className="sandbox-note">Sandbox checkout — no real money moves.</p>
        <div className="checkout-actions">
          <button type="button" onClick={pay}>
            Pay {inr(grossPaise)} securely
          </button>
          <button type="button" className="ghost" onClick={reset}>
            Change amount
          </button>
        </div>
        {error && (
          <p role="alert" className="gate-error">
            {error}
          </p>
        )}
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="checkout processing" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p>
          Contacting your bank…<br />
          <span className="muted">Do not close this window.</span>
        </p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="checkout done" aria-live="polite">
        <p className="done-check" aria-hidden="true">
          ✓
        </p>
        <p>Thank you — your pledge is recorded.</p>
        <div className="receipt">
          <div className="receipt-row">
            <span>Reference</span>
            <strong>TXN-{contributionId.slice(-6).toUpperCase()}</strong>
          </div>
          <div className="receipt-row">
            <span>Amount</span>
            <strong>{inr(grossPaise)}</strong>
          </div>
          <div className="receipt-row">
            <span>Paid via</span>
            <strong>{method}</strong>
          </div>
          <div className="receipt-row">
            <span>Reaches the case</span>
            <strong>{inr(netPaise)}</strong>
          </div>
        </div>
        <p className="receipt-note">
          The 5% platform fee covers payment processing — it is never charged on top. If the goal is missed, you get a
          full refund.
        </p>
        <button type="button" className="ghost" onClick={reset}>
          Back another case
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <div className="back-head">
        <p className="back-title">Back this matter</p>
      </div>
      <div className="quick-amounts">
        {QUICK_AMOUNTS.map((amt) => (
          <button
            type="button"
            key={amt}
            className={`quick-amount ${Number(amount) === amt ? 'selected' : ''}`}
            onClick={() => setAmount(String(amt))}
            disabled={busy}
          >
            ₹{amt.toLocaleString('en-IN')}
          </button>
        ))}
      </div>
      <label htmlFor="amount">Or enter an amount (₹)</label>
      <input
        id="amount"
        type="number"
        min="1"
        step="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={busy}
        placeholder="Your amount, in rupees"
      />
      <button type="submit" disabled={busy}>
        {busy ? 'Contacting…' : 'Back this campaign'}
      </button>
      <p className="back-reassure">
        You are only charged if this matter reaches its goal — otherwise every backer is refunded in full. 95% reaches
        the case.{' '}
        <Link href="/legal/terms">
          Terms
        </Link>
      </p>
      {step === 'error' && error && (
        <p role="alert" className="gate-error">
          {error}
        </p>
      )}
    </form>
  )
}
