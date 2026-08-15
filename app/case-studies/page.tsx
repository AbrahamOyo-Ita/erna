import type { Metadata } from 'next'
import { BriefcaseBusiness, ShoppingBag, UserRound } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { ContentHero } from '@/components/marketing/content-page'

export const metadata: Metadata = { title: 'Erna Use Cases | Illustrative Worker, Advertiser and Seller Stories', description: 'Explore clearly labeled illustrative examples of how workers, advertisers and marketplace sellers can use Erna.' }

const stories = [
  { icon: UserRound, label: 'Illustrative worker example', title: 'Ada turns a spare hour into trackable earnings.', copy: 'Ada chooses three tasks with instructions she can complete, uploads proof and watches each review status before requesting a withdrawal.', outcome: 'The point: every reward and status is visible before money moves.' },
  { icon: BriefcaseBusiness, label: 'Illustrative advertiser example', title: 'A local launch funds a defined engagement target.', copy: 'A small team selects its platform, action and quantity. Erna calculates the escrow budget, publishes only after funding and gathers proof in one review queue.', outcome: 'The point: the campaign cannot promise unfunded worker rewards.' },
  { icon: ShoppingBag, label: 'Illustrative seller example', title: 'A Calabar seller publishes clear product photos.', copy: 'The seller uploads sanitized listing images, adds a Nigeria contact number and shares the listing. Buyers open a prefilled WhatsApp conversation while payments stay outside Erna.', outcome: 'The point: discovery is convenient and the payment boundary is explicit.' },
]

export default function CaseStudiesPage() { return <MarketingShell><ContentHero current="Illustrative stories" eyebrow="Composite examples" title="Three ways Erna can fit real work." copy="These are illustrative product scenarios, not testimonials or claims about real customers." /><section className="section phase4-section"><div className="page-container phase4-story-grid">{stories.map(({ icon: Icon, label, title, copy, outcome }, index) => <article key={title}><div><span>0{index + 1}</span><Icon aria-hidden="true" /></div><small>{label}</small><h2>{title}</h2><p>{copy}</p><strong>{outcome}</strong></article>)}</div></section></MarketingShell> }
