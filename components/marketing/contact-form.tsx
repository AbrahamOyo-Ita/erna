'use client'

import { FormEvent, useState } from 'react'
import { ArrowUpRight, Send } from 'lucide-react'
import { CustomSelect } from '@/components/ui/select'

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

export function ContactForm() {
  const [status, setStatus] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return

    if (!supportEmail) {
      setStatus('Customer care email is being configured. Please try again later.')
      return
    }

    const data = new FormData(form)
    const name = String(data.get('name') || '')
    const email = String(data.get('email') || '')
    const topic = String(data.get('topic') || '')
    const reference = String(data.get('reference') || '')
    const message = String(data.get('message') || '')
    const subject = encodeURIComponent(`[${topic}] Erna customer care request`)
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nReference: ${reference || 'Not provided'}\n\n${message}`)
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`
    setStatus('Your email app should open with the request ready to send.')
  }

  return <form className="care-form" onSubmit={handleSubmit} noValidate>
    <div className="form-heading"><span>Send a request</span><strong>Tell us what happened.</strong><p>Include only the details needed to locate the task or transaction. Never share your password or OTP.</p></div>
    <div className="form-grid">
      <label><span>Full name</span><input name="name" type="text" autoComplete="name" minLength={2} maxLength={80} required placeholder="Your name" /></label>
      <label><span>Email address</span><input name="email" type="email" autoComplete="email" maxLength={120} required placeholder="you@example.com" /></label>
    </div>
    <div className="field-block"><span className="field-label">What do you need help with?</span><CustomSelect name="topic" required ariaLabel="Support topic" placeholder="Select a topic" options={['Task submission', 'Task campaign', 'Wallet or withdrawal', 'Account access', 'Referral reward', 'Report a safety concern', 'Something else'].map(value => ({ value, label: value }))} /></div>
    <label><span>Task or transaction reference <small>Optional</small></span><input name="reference" type="text" maxLength={100} placeholder="For example, TASK-2048" /></label>
    <label><span>How can we help?</span><textarea name="message" minLength={20} maxLength={2000} rows={6} required placeholder="Describe the issue, what you expected, and what you have already tried." /></label>
    <div className="form-submit"><button className="button button-primary" type="submit">Prepare support email <Send size={17} /></button><span>Opens your email app <ArrowUpRight size={14} /></span></div>
    {status && <p className="form-status" role="status">{status}</p>}
  </form>
}
