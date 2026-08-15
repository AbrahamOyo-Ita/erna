import Link from 'next/link'
import { ArrowRight, Check, ChevronRight } from 'lucide-react'

export function Breadcrumbs({ current }: { current: string }) {
  return <nav className="content-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight aria-hidden="true" /><span aria-current="page">{current}</span></nav>
}

export function ContentHero({ eyebrow, title, copy, current, action = 'Create your free account', actionHref = '/signup' }: { eyebrow: string; title: string; copy: string; current: string; action?: string; actionHref?: string }) {
  return <section className="phase4-hero"><div className="page-container"><Breadcrumbs current={current} /><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p><Link className="button button-primary" href={actionHref}>{action}<ArrowRight size={18} /></Link></div></section>
}

export function PromiseList({ items }: { items: string[] }) {
  return <div className="phase4-promises">{items.map(item => <span key={item}><Check aria-hidden="true" />{item}</span>)}</div>
}
