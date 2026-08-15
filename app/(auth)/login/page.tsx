import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthShell } from '@/components/auth/auth-shell'

export default function LoginPage() { return <AuthShell compact title="Welcome back" description="Log in to continue earning, posting and tracking your money."><Suspense fallback={<div className="auth-form-skeleton" aria-label="Loading login form" />}><AuthForm mode="login" /></Suspense></AuthShell> }
