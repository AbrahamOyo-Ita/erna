'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useRef, useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { createClient } from '@/lib/supabase/client'
import { trackConversion } from '@/lib/analytics'

export function OtpForm() {
  const router = useRouter()
  const params = useSearchParams()
  const method = params.get('method') === 'phone' ? 'phone' : 'email'
  const identifier = params.get('identifier') ?? ''
  const recovery = params.get('mode') === 'recovery'
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captcha = useRef<HCaptcha>(null)
  const captchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const payload = method === 'email'
        ? { email: identifier, token, type: 'signup' as const }
        : { phone: identifier, token, type: 'sms' as const }
      const { error } = await supabase.auth.verifyOtp(payload)
      if (error) throw error
      if (!recovery) trackConversion('signup_complete')
      router.replace(recovery ? '/reset-password' : '/thank-you?event=signup')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That code could not be verified.')
    } finally { setLoading(false) }
  }

  async function resend() {
    setMessage(null)
    try {
      const supabase = createClient()
      const { error } = method === 'email'
        ? await supabase.auth.resend({ type: 'signup', email: identifier, options: { captchaToken: captchaToken ?? undefined } })
        : await supabase.auth.signInWithOtp({ phone: identifier, options: { captchaToken: captchaToken ?? undefined } })
      if (error) throw error
      setMessage('A new code has been sent.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not resend the code.') }
    finally {
      captcha.current?.resetCaptcha()
      setCaptchaToken(null)
    }
  }

  return <form className="auth-form" onSubmit={verify}><div className="otp-destination"><span>Code sent to</span><strong>{identifier || 'your account'}</strong></div><label><span>6-digit verification code</span><input className="otp-input" value={token} onChange={event => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required placeholder="000000" aria-describedby="otp-help" /><small id="otp-help">Enter the code exactly as it appears in your message.</small></label>{message && <p className="auth-status" role="status">{message}</p>}<button className="button button-primary auth-submit" type="submit" disabled={loading || token.length !== 6}>{loading && <LoaderCircle className="spin" size={18} />}Verify account{!loading && <ArrowRight size={18} />}</button>{captchaSiteKey && <div className="auth-captcha"><HCaptcha ref={captcha} sitekey={captchaSiteKey} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} /></div>}<button className="auth-resend" type="button" onClick={resend} disabled={Boolean(captchaSiteKey && !captchaToken)}>Send a new code</button><p className="auth-switch"><Link href="/signup">Use a different account</Link></p></form>
}
