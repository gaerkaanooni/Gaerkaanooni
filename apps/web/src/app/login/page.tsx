import LoginGate from '@/components/LoginGate'

export const metadata = {
  title: 'Sign in — Gaerkaanooni',
}

export default function LoginPage() {
  return (
    <main className="narrow">
      <p className="detail-category reveal">Citizen access · phone OTP / Google</p>
      <h1>Sign in</h1>
      <p className="lede">
        Signing in lets you back cases, follow matters, and submit new ones — it costs nothing until a case is
        funded.
      </p>
      <LoginGate />
    </main>
  )
}
