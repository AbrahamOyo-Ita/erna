import type { Metadata } from 'next'
import { BadgeCheck, Banknote, MousePointerClick, ShieldCheck } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { ContentHero } from '@/components/marketing/content-page'

export const metadata: Metadata = { title: 'How Erna Works | Funded Tasks, Proof and Payouts', description: 'See how workers complete funded digital tasks, submit proof and receive tracked Erna wallet payouts in Nigeria.' }

const steps = [
  { icon: MousePointerClick, number: '01', title: 'Choose work with a visible payout', copy: 'Filter the task feed, read the exact action and confirm the worker reward before starting.' },
  { icon: BadgeCheck, number: '02', title: 'Complete the task and submit proof', copy: 'Follow the advertiser instructions and upload a private, server-validated screenshot for review.' },
  { icon: ShieldCheck, number: '03', title: 'Review protects both sides', copy: 'Advertisers or sampled automatic review confirm valid work. Rejections include a reason and can be appealed once.' },
  { icon: Banknote, number: '04', title: 'Track earnings through withdrawal', copy: 'Approved rewards credit the wallet once. Withdrawals move from Requested to Processing and then Paid or Failed.' },
]

export default function HowItWorksPage() { return <MarketingShell><ContentHero current="How it works" eyebrow="A clear workflow" title="From funded task to tracked payout." copy="Erna shows what happens at every stage, including proof review, wallet credit and withdrawal status." /><section className="section phase4-section"><div className="page-container phase4-step-grid">{steps.map(({ icon: Icon, number, title, copy }) => <article key={number}><span>{number}</span><Icon aria-hidden="true" /><h2>{title}</h2><p>{copy}</p></article>)}</div></section><section className="phase4-band"><div className="page-container"><div><span className="eyebrow">Real service levels</span><h2>Published timelines, not instant-payout theatre.</h2></div><p>Task review timing depends on the campaign review mode. Withdrawal targets are 24 to 48 hours on Free, up to 36 hours on Plus, and 12 to 24 hours on Pro. Bank or compliance delays remain visible in status updates.</p></div></section></MarketingShell> }
