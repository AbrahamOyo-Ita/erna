import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthShell } from '@/components/auth/auth-shell'

export default function SignupPage() { return <AuthShell compact title="Create your account" description="Free to join. No activation payment and no role selection required."><Suspense fallback={<div className="auth-form-skeleton" aria-label="Loading signup form" />}><AuthForm mode="signup" /></Suspense></AuthShell> }
