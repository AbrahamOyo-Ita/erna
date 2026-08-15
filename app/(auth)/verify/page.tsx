import { Suspense } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { OtpForm } from '@/components/auth/otp-form'

export default function VerifyPage() { return <AuthShell title="Verify it is you" description="Use the one-time code we sent. Codes expire for your protection."><Suspense fallback={<div className="auth-form-skeleton" aria-label="Loading verification form" />}><OtpForm /></Suspense></AuthShell> }
