'use client'

import { useState } from 'react'

/**
 * FAQ — objection handling for a civic legal-funding platform. Each item
 * pre-empts the questions a donor or a person who needs help will have. Dignity-
 * first throughout: a person needing help is always "a person who needs a fair
 * hearing", never a label.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: 'Am I actually charged right away when I pledge?',
    a: 'No. Your pledge is only charged if the matter reaches its goal by the deadline. If it does not, every backer is refunded in full, automatically.',
  },
  {
    q: 'How do I know a matter is genuine?',
    a: 'Nothing is funded without a volunteer lawyer on record confirming it is a real legal matter worth a hearing. Every screening decision is logged and visible.',
  },
  {
    q: 'What does my money actually pay for?',
    a: 'Court fees, counsel fees and expert evidence — tracked line-by-line on a public ledger for each matter. A flat 5% covers the platform and payment processing and is never charged on top.',
  },
  {
    q: 'Can I refer someone who needs help but hasn’t asked for it?',
    a: 'Yes — you can put a matter forward and stay anonymous if you like. Their contact is only stored if they have agreed to be reached. No one is ever labeled by their circumstances.',
  },
  {
    q: 'Do I need a lawyer to submit a matter?',
    a: 'No. You describe what happened in your own words; volunteer lawyers review it and guide it from there.',
  },
  {
    q: 'Where does the response fund come from?',
    a: 'A standing pool for urgent, same-day threats. It is funded by direct contributions and by a quarter of any campaign surplus — nothing else. Every draw is public.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <>
      <div className="section-head reveal">
        <span className="no">§ IV</span>
        <h2>Questions, answered</h2>
        <span className="line" />
      </div>
      <div className="faq-list reveal">
        {FAQS.map((item, i) => {
          const isOpen = open === i
          return (
            <div className={`faq-item ${isOpen ? 'open' : ''}`} key={i}>
              <button type="button" className="faq-q" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                <span>{item.q}</span>
                <span className="faq-icon" aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && <p className="faq-a">{item.a}</p>}
            </div>
          )
        })}
      </div>
    </>
  )
}
