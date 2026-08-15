'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true); setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.replace('/app')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your password.') }
    finally { setLoading(false) }
  }

  return <form className="auth-form" onSubmit={submit}><label><span>New password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required placeholder="At least 8 characters" /></label><label><span>Confirm new password</span><input type="password" value={confirm} onChange={event => setConfirm(event.target.value)} minLength={8} autoComplete="new-password" required placeholder="Repeat your password" /></label>{error && <p className="auth-status error" role="alert">{error}</p>}<button className="button button-primary auth-submit" disabled={loading}>{loading && <LoaderCircle className="spin" size={18} />}Save new password{!loading && <ArrowRight size={18} />}</button></form>
}
