'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useRef, useState } from 'react'
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { authIdentifier, safeNextPath, type AuthMethod } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup' | 'forgot'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [method, setMethod] = useState<AuthMethod>('email')
  const [identifier, setIdentifier] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(() => {
    const error = searchParams.get('error')
    return error ? { type: 'error', text: error } : null
  })
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captcha = useRef<HCaptcha>(null)
  const captchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY

  function resetCaptcha() {
    captcha.current?.resetCaptcha()
    setCaptchaToken(null)
  }

  async function continueWithGoogle() {
    setStatus(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const next = safeNextPath(searchParams.get('next'))
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      })
      if (error) throw error
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Google sign-in could not start.' })
      setLoading(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const value = authIdentifier(method, identifier)

      if (mode === 'signup') {
        const credentials = method === 'email' ? { email: value, password } : { phone: value, password }
        const { error } = await supabase.auth.signUp({ ...credentials, options: { captchaToken: captchaToken ?? undefined, data: { full_name: name.trim(), referral_code: referralCode.trim().toUpperCase() || null } } })
        if (error) throw error
        const query = new URLSearchParams({ method, identifier: value, mode: 'signup' })
        router.push(`/verify?${query}`)
        return
      }

      if (mode === 'login') {
        const credentials = method === 'email'
          ? { email: value, password, options: { captchaToken: captchaToken ?? undefined } }
          : { phone: value, password, options: { captchaToken: captchaToken ?? undefined } }
        const { error } = await supabase.auth.signInWithPassword(credentials)
        if (error) throw error
        router.replace(safeNextPath(searchParams.get('next')))
        router.refresh()
        return
      }

      if (method === 'email') {
        const { error } = await supabase.auth.resetPasswordForEmail(value, { captchaToken: captchaToken ?? undefined, redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` })
        if (error) throw error
        setStatus({ type: 'success', text: 'Check your email for a secure password reset link.' })
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: value, options: { captchaToken: captchaToken ?? undefined } })
        if (error) throw error
        router.push(`/verify?method=phone&identifier=${encodeURIComponent(value)}&mode=recovery`)
      }
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Something went wrong. Please try again.' })
    } finally {
      resetCaptcha()
      setLoading(false)
    }
  }

  return <form className={`auth-form auth-form-${mode}`} onSubmit={submit}>
    {mode !== 'forgot' && <><button className="google-auth-button" type="button" onClick={continueWithGoogle} disabled={loading}><Image src="/google-g-logo.png" width={20} height={20} alt="" aria-hidden="true" />Continue with Google</button><div className="auth-divider"><span>or continue with</span></div></>}
    <div className="auth-method" role="group" aria-label="Sign in method"><button type="button" className={method === 'email' ? 'active' : ''} onClick={() => setMethod('email')}>Email</button><button type="button" className={method === 'phone' ? 'active' : ''} onClick={() => setMethod('phone')}>Phone</button></div>
    {mode === 'signup' && <label><span>Full name</span><input value={name} onChange={event => setName(event.target.value)} autoComplete="name" required minLength={2} placeholder="Your full name" /></label>}
    <label><span>{method === 'email' ? 'Email address' : 'Phone number'}</span><input type={method === 'email' ? 'email' : 'tel'} inputMode={method === 'email' ? 'email' : 'tel'} value={identifier} onChange={event => setIdentifier(event.target.value)} autoComplete={method === 'email' ? 'email' : 'tel'} required placeholder={method === 'email' ? 'you@example.com' : '0801 234 5678'} /><small>{method === 'phone' && 'Nigerian numbers are saved in +234 format.'}</small></label>
    {mode !== 'forgot' && <label><span>Password</span><span className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>}
    {mode === 'signup' && <label><span>Referral code <em>Optional</em></span><input value={referralCode} onChange={event => setReferralCode(event.target.value.toUpperCase())} autoComplete="off" maxLength={12} placeholder="Enter code" /><small>The code is validated securely when your account is created.</small></label>}
    {mode === 'login' && <Link className="auth-inline-link" href="/forgot-password">Forgot password?</Link>}
    {captchaSiteKey && <div className="auth-captcha"><HCaptcha ref={captcha} sitekey={captchaSiteKey} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} /></div>}
    {status && <p className={`auth-status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.text}</p>}
    <button className="button button-primary auth-submit" type="submit" disabled={loading || Boolean(captchaSiteKey && !captchaToken)}>{loading ? <LoaderCircle className="spin" size={18} /> : null}{mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create free account' : 'Send reset instructions'}{!loading && <ArrowRight size={18} />}</button>
    <p className="auth-switch">{mode === 'signup' ? <>Already have an account? <Link href="/login">Log in</Link></> : mode === 'login' ? <>New to Erna? <Link href="/signup">Create an account</Link></> : <><Link href="/login">Back to login</Link></>}</p>
  </form>
}
