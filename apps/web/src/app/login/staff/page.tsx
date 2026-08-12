import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: 'Staff sign-in — Gaerkaanooni',
}

export default function StaffLoginPage() {
  return (
    <main className="narrow">
      <p className="detail-category reveal">Staff access · email &amp; password</p>
      <h1>Staff sign in</h1>
      <LoginForm />
      <p className="gate-muted">
        A citizen? Sign in with OTP or Google — <a href="/login">public sign-in →</a>
      </p>
    </main>
  )
}
