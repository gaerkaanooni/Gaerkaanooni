import type { Metadata } from 'next'
import IntakeForm from '@/components/IntakeForm'

export const metadata: Metadata = {
  title: 'Submit a case — Gaerkaanooni',
}

// Allow /submit and /submit?for=other (the consolidated intake page).
export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const forWhom = params.for === 'other' ? 'other' : 'self'

  return (
    <main>
      <section className="hero reveal">
        <p className="kicker">{forWhom === 'other' ? 'You can be the reason someone gets heard' : 'It costs nothing to start'}</p>
        <h1>{forWhom === 'other' ? 'Refer someone who needs a fair hearing' : 'Submit a case'}</h1>
        <p className="lede">
          {forWhom === 'other'
            ? 'If you know someone with a genuine matter who cannot afford a lawyer, you can put it forward for them — even anonymously.'
            : 'Tell us about a legal matter that needs a hearing. It can be your own, or one you have been asked to help with. You do not need a lawyer to start.'}
        </p>
      </section>

      <div className="narrow">
        {forWhom === 'other' && (
          <>
            <p className="refer-privacy reveal d2">
              Privacy is the point of this page. The person you are helping is never labeled by their circumstances,
              and their contact is only stored once they have chosen to be reached.
            </p>
          </>
        )}
        <IntakeForm initialFor={forWhom} key={forWhom} />
      </div>
    </main>
  )
}
