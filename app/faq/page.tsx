import type { Metadata } from 'next'
import { ChevronDown } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { ContentHero } from '@/components/marketing/content-page'

export const metadata: Metadata = { title: 'Erna FAQ | Payouts, Tasks, Referrals and Advertising', description: 'Answers about Erna payouts, free signup, withdrawal timing, task prices, referrals and advertiser campaigns.' }

const faqs = [
  ['How do Erna payouts work?', 'An advertiser-funded task reserves its budget before publication. After valid proof is approved, the stated worker reward is credited once to the Erna wallet.'],
  ['Why is there no activation fee?', 'Workers should not have to pay before they can earn. Creating an account and accessing the standard task feed is free. Optional plans unlock only after a successful first withdrawal.'],
  ['How long do withdrawals take?', 'The implemented targets are 24 to 48 hours on Free, up to 36 hours on Plus, and 12 to 24 hours on Pro. Every request shows Requested, Processing, Paid or Failed.'],
  ['How is task pricing determined?', 'Pricing depends on the platform and action. Workers see the full approved reward and advertisers see the campaign unit price before funding.'],
  ['How does the referral program work?', 'Share your direct referral code. A standard eligible referral reward is issued only after the referred user completes their first approved task. There are no multi-level referral chains.'],
  ['How do I become an advertiser?', 'Create the same free Erna account, open Post a task, choose the platform and action, add clear instructions and fund the calculated escrow budget. The task becomes public only after funding succeeds.'],
]

export default function FaqPage() { return <MarketingShell><ContentHero current="FAQ" eyebrow="Six straight answers" title="Understand Erna before you start." copy="The important rules for workers and advertisers, written without hidden conditions." action="Ask customer care" actionHref="/contact" /><section className="section phase4-section"><div className="page-container phase4-faq"><div><span className="eyebrow">Frequently asked</span><h2>Clear work needs clear rules.</h2><p>For account-specific help, include only the task or transaction reference. Never send your password or OTP.</p></div><div className="faq-list">{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<ChevronDown size={20} /></summary><p>{answer}</p></details>)}</div></div></section></MarketingShell> }
