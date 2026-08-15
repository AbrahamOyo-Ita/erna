import { AuthShell } from '@/components/auth/auth-shell'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() { return <AuthShell title="Choose a new password" description="Use at least eight characters and keep it unique to Erna."><ResetPasswordForm /></AuthShell> }
