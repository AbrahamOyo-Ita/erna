import type { Metadata } from 'next'
import { ArrowRight, CircleHelp, Clock3, KeyRound, LifeBuoy, MessageSquareText, ShieldAlert, WalletCards } from 'lucide-react'
import { ContactForm } from '@/components/marketing/contact-form'
import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Customer Care | Erna',
  description: 'Get help with Erna tasks, campaigns, wallet activity, withdrawals and account access.',
}

const helpTopics = [
  { icon: MessageSquareText, title: 'Task help', text: 'Instructions, proof submission, review outcomes or an appeal.' },
  { icon: WalletCards, title: 'Wallet help', text: 'Funding, an earnings credit, withdrawal status or a failed transfer.' },
  { icon: KeyRound, title: 'Account help', text: 'OTP delivery, account access or a suspicious session.' },
  { icon: ShieldAlert, title: 'Safety report', text: 'Misleading instructions, abusive content or activity that feels unsafe.' },
]

export default function ContactPage() {
  return <MarketingShell>
    <section className="content-hero care-hero"><div className="content-orb" aria-hidden="true" /><div className="page-container care-hero-grid"><div><span className="eyebrow"><LifeBuoy size={15} /> Customer care</span><h1>Help that starts with the <span>right context.</span></h1><p>Tell us where the problem happened and include the reference that connects it to your account. That gives customer care a clean place to begin.</p><div className="care-promise"><Clock3 size={18} /><div><strong>Clear follow-through</strong><span>Your request should be acknowledged, investigated and closed with a visible outcome.</span></div></div></div><div className="care-route-map" aria-label="Customer care request flow"><span className="route-label">What happens next</span><div><b>01</b><p><strong>Send the context</strong><span>Choose a topic and add the relevant reference.</span></p></div><div><b>02</b><p><strong>We trace the event</strong><span>Task, wallet and account records guide the review.</span></p></div><div><b>03</b><p><strong>You get an outcome</strong><span>We explain the resolution or the next action required.</span></p></div></div></div></section>
    <section className="care-topics"><div className="page-container topic-rail">{helpTopics.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={20} /><div><strong>{title}</strong><p>{text}</p></div></article>)}</div></section>
    <section className="content-section care-request"><div className="page-container care-request-grid"><div className="care-request-copy"><span className="eyebrow">Contact customer care</span><h2>Give us enough to investigate, not your secrets.</h2><p>A good request includes the task or transaction reference, the outcome you expected and a short description of what happened.</p><div className="security-note"><ShieldAlert size={21} /><div><strong>Keep credentials private</strong><span>Erna support should never ask for your password, one-time password, card PIN or full card number.</span></div></div><a className="arrow-link" href="/trust">Read Trust &amp; Safety <ArrowRight size={18} /></a></div><ContactForm /></div></section>
    <section className="content-section self-help"><div className="page-container self-help-grid"><div><span className="eyebrow"><CircleHelp size={15} /> Before you send</span><h2>Three details that speed up a review.</h2></div><ol><li><b>01</b><span><strong>Use the account email</strong>It helps locate the right user without asking for sensitive credentials.</span></li><li><b>02</b><span><strong>Add the reference</strong>Task and transaction references connect the request to its audit trail.</span></li><li><b>03</b><span><strong>Describe the last visible state</strong>Requested, Processing, Paid, Failed, Pending or Rejected tells us where to look.</span></li></ol></div></section>
  </MarketingShell>
}
