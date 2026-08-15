import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { ContentHero } from '@/components/marketing/content-page'

export const metadata: Metadata = { title: 'Erna Pricing | Worker Rewards and Advertiser Task Costs', description: 'Compare Erna worker payouts, advertiser task prices and optional Free, Plus and Pro account benefits.' }

const plans = [
  { name: 'Free', price: '₦0', copy: 'Full ad exposure, standard task ordering and a 24 to 48 hour withdrawal target.' },
  { name: 'Plus', price: '₦500 / month', copy: 'Lighter ad exposure, priority task ordering and a withdrawal target of up to 36 hours.' },
  { name: 'Pro', price: '₦1,000 / month', copy: 'No ads, priority task ordering, 12 to 24 hour withdrawal target and the implemented Pro referral benefit.' },
]
const rates = [['Facebook follow or like','₦10','₦16'],['Instagram follow','₦15','₦23'],['Instagram comment','₦25','₦39'],['YouTube subscribe','₦150','₦231'],['Play Store review','₦100','₦154'],['App Store review','₦200','₦308']]

export default function PricingPage() { return <MarketingShell ctaLabel="Post a task"><ContentHero current="Pricing" eyebrow="Published pricing" title="One amount for the worker. One amount for the advertiser." copy="Every task shows its reward and funded campaign cost before either side commits." action="Post a funded task" /><section className="section phase4-section"><div className="page-container"><div className="phase4-plan-grid">{plans.map(plan => <article key={plan.name}><span>{plan.name}</span><strong>{plan.price}</strong><p>{plan.copy}</p><small>Optional upgrades unlock only after a first paid withdrawal.</small></article>)}</div><div className="phase4-rate-table"><div className="phase4-rate-head"><h2>Example task rates</h2><BadgeCheck aria-hidden="true" /></div>{rates.map(rate => <div className="phase4-rate-row" key={rate[0]}><strong>{rate[0]}</strong><span><small>Worker gets</small>{rate[1]}</span><span><small>Advertiser pays</small>{rate[2]}</span></div>)}<p>These examples match the implemented server pricing. The task builder remains the final source for the exact campaign total.</p></div><Link className="arrow-link" href="/how-it-works">See how funded tasks work <ArrowRight size={18} /></Link></div></section></MarketingShell> }
