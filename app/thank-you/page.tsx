import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = { title: 'Thank You | Your Erna Progress Is Recorded', description: 'Confirmation for completed Erna account, task and withdrawal milestones.', robots: { index: false, follow: false } }

const messages = {
  signup: { eyebrow: 'Account verified', title: 'Welcome to clear work and honest payouts.', copy: 'Your Erna account is ready. There is no activation fee. Open the task feed and choose only work that fits your time.', action: 'Open task feed', href: '/app' },
  'first-task': { eyebrow: 'First task approved', title: 'Your proof passed review.', copy: 'The approved reward is recorded in your wallet. You can review the ledger and keep building toward your withdrawal threshold.', action: 'Review wallet', href: '/app' },
  withdrawal: { eyebrow: 'Withdrawal requested', title: 'Your payout is moving with a visible status.', copy: 'Track Requested, Processing and Paid inside your wallet. Free targets 24 to 48 hours, Plus up to 36 hours, and Pro 12 to 24 hours.', action: 'Track withdrawal', href: '/app' },
} as const

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams
  const message = messages[event as keyof typeof messages] ?? messages.signup
  return <MarketingShell><section className="thank-you-page"><div className="page-container"><span className="thank-you-mark"><BadgeCheck aria-hidden="true" /></span><small>{message.eyebrow}</small><h1>{message.title}</h1><p>{message.copy}</p><div><Link className="button button-primary" href={message.href}>{message.action}<ArrowRight size={18} /></Link><Link className="button button-secondary" href="/trust">How Erna protects payouts</Link></div></div></section></MarketingShell>
}
