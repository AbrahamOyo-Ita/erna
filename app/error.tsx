'use client'

import Link from 'next/link'
import { RotateCcw } from 'lucide-react'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="error-recovery"><div><small>Erna could not finish that page</small><h1>Your account data has not been changed.</h1><p>Retry the request. If your session expired, sign in again and continue safely.</p><button className="button button-primary" onClick={reset}><RotateCcw size={17} />Try again</button><Link href="/login">Return to login</Link></div></main>
}
