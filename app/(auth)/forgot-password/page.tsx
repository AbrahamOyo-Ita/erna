import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthShell } from '@/components/auth/auth-shell'

export default function ForgotPasswordPage() { return <AuthShell title="Reset your password" description="Choose email or phone and we will send secure recovery instructions."><Suspense fallback={<div className="auth-form-skeleton" aria-label="Loading password reset form" />}><AuthForm mode="forgot" /></Suspense></AuthShell> }
