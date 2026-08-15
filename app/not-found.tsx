import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'

export default function NotFound() {
  return <MarketingShell><section className="not-found-page"><div className="page-container"><span><Compass aria-hidden="true" /></span><small>404 / Page not found</small><h1>This path does not lead to an Erna task.</h1><p>The link may be old, private or mistyped. Return home or sign in to open your task feed.</p><div><Link className="button button-primary" href="/">Back to home<ArrowRight size={18} /></Link><Link className="button button-secondary" href="/login">Open task feed</Link></div></div></section></MarketingShell>
}
