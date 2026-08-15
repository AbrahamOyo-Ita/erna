'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight, BadgeCheck, Banknote, Check, ChevronDown, CircleDollarSign, Clock3, LockKeyhole, Megaphone, Menu, MousePointerClick, Share2, ShieldCheck, Sparkles, UsersRound, X } from 'lucide-react'
import heroImage from '../Erna Hero Image.png'
import ernaLogo from '../Erna-Logo.png'
import { StickyMobileCta } from '@/components/marketing/marketing-shell'

const platforms = [
  { name: 'Facebook', src: '/brands/facebook.svg' }, { name: 'Instagram', src: '/brands/instagram.svg' },
  { name: 'TikTok', src: '/brands/tiktok.svg' }, { name: 'X', src: '/brands/x.svg' },
  { name: 'LinkedIn', src: '/brands/linkedin.svg' }, { name: 'YouTube', src: '/brands/youtube.svg' },
]
const steps = [
  { icon: MousePointerClick, title: 'Pick a clear task', text: 'Browse opportunities by platform, action and payout before you commit.' },
  { icon: BadgeCheck, title: 'Complete and prove it', text: 'Follow the instructions, upload proof and track the review in one place.' },
  { icon: Banknote, title: 'Get paid for the work', text: 'Approved earnings land in your wallet, ready for a tracked withdrawal.' },
]
const pricing = [
  {
    platform: 'Facebook + TikTok',
    className: 'rate-card-featured',
    icons: ['/brands/facebook.svg', '/brands/tiktok.svg'],
    actions: [
      { name: 'Like or follow', worker: '₦10', advertiser: '₦16' },
      { name: 'Share or repost', worker: '₦15', advertiser: '₦23' },
      { name: 'Comment', worker: '₦20', advertiser: '₦31' },
    ],
  },
  {
    platform: 'Instagram + X',
    className: 'rate-card-social',
    icons: ['/brands/instagram.svg', '/brands/x.svg'],
    actions: [
      { name: 'Like or react', worker: '₦12', advertiser: '₦19' },
      { name: 'Follow', worker: '₦15', advertiser: '₦23' },
      { name: 'Share or repost', worker: '₦20', advertiser: '₦31' },
      { name: 'Comment', worker: '₦25', advertiser: '₦39' },
    ],
  },
  {
    platform: 'LinkedIn',
    className: 'rate-card-linkedin',
    icons: ['/brands/linkedin.svg'],
    actions: [
      { name: 'Like or react', worker: '₦12', advertiser: '₦19' },
      { name: 'Company follow', worker: '₦15', advertiser: '₦23' },
      { name: 'Share or repost', worker: '₦20', advertiser: '₦31' },
      { name: 'Comment', worker: '₦25', advertiser: '₦39' },
    ],
  },
]

function Brand() { return <span className="brand-logo-frame"><Image className="brand-logo-image" src={ernaLogo} alt="Erna" priority /></span> }

function HeroVisual() {
  return <div className="hero-visual">
    <div className="hero-image-halo" aria-hidden="true" />
    <Image
      className="hero-image"
      src={heroImage}
      alt="A smiling Erna user celebrating a payment received on her phone"
      priority
      sizes="(max-width: 760px) 100vw, 48vw"
    />
  </div>
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  return <main>
    <header className="site-header home-header">
      <a href="#top" className="brand-link" aria-label="Erna home"><Brand /></a>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#features">Workers</a><a href="#businesses">Advertisers</a><a href="#pricing">Pricing</a><a href="/about">About</a><a href="/trust">Trust & safety</a><a href="/contact">Customer care</a></nav>
      <div className="header-actions"><a className="text-link" href="/login">Log in</a><a className="button button-primary button-small" href="/signup">Join Erna <ArrowRight size={16} /></a></div>
      <button className="menu-button" type="button" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      {menuOpen && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation"><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#features" onClick={() => setMenuOpen(false)}>For workers</a><a href="#businesses" onClick={() => setMenuOpen(false)}>For advertisers</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a><a href="#referrals" onClick={() => setMenuOpen(false)}>Refer & earn</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a><span className="mobile-nav-divider" aria-hidden="true" /><a href="/about" onClick={() => setMenuOpen(false)}>About Erna</a><a href="/trust" onClick={() => setMenuOpen(false)}>Trust & safety</a><a href="/contact" onClick={() => setMenuOpen(false)}>Customer care</a><a className="button button-primary" href="#get-started" onClick={() => setMenuOpen(false)}>Join Erna</a></nav>}
    </header>
    <section id="top" className="hero-section"><div className="hero-glow" aria-hidden="true" /><div className="page-container hero-grid"><div className="hero-copy"><div className="eyebrow"><ShieldCheck size={16} /> Nigeria&apos;s trust-first task platform</div><h1>Earn from real tasks. <span>Keep every naira.</span></h1><p>Start free, see every payout upfront and withdraw on a clear 24-48 hour timeline.</p><div className="hero-actions"><a className="button button-primary" href="#get-started">Start earning free <ArrowRight size={18} /></a><a className="button button-secondary" href="#businesses">Post a task</a></div></div><HeroVisual /></div></section>
    <section className="trust-section" aria-label="Erna trust commitments"><div className="page-container"><div className="trust-rail"><div className="trust-lead"><div><span>Start earning at</span><strong>₦0</strong></div><p><b>No activation fee</b>Free to join and earn</p></div><div className="trust-promises"><div><span className="trust-icon"><Clock3 size={18} /></span><p><strong>Fast withdrawals</strong><small>Published 24-48 hour SLA</small></p></div><div><span className="trust-icon"><BadgeCheck size={18} /></span><p><strong>Transparent pricing</strong><small>Know the payout first</small></p></div><div><span className="trust-icon"><LockKeyhole size={18} /></span><p><strong>Funded before launch</strong><small>Advertiser budget in escrow</small></p></div></div></div></div></section>
    <section className="platform-section" aria-label="Supported platforms"><div className="page-container platform-stage"><div className="platform-copy"><span className="eyebrow">Supported networks</span><h2>One task feed. <span>Six places to grow.</span></h2><p>Choose where you want to earn or where your campaign needs real attention.</p></div><div className="platform-cloud"><div className="platform-core"><Sparkles size={17} /><span>Erna task network</span></div>{platforms.map(({name,src},index) => <div className={`platform-chip platform-chip-${index+1}`} key={name}><Image src={src} alt={`${name} logo`} width={24} height={24} /><strong>{name}</strong></div>)}</div></div></section>
    <section id="how-it-works" className="section how-section"><div className="page-container"><div className="section-heading"><span className="eyebrow">How it works</span><h2>From spare minutes to money you can track.</h2><p>Every step is visible, from choosing the work to receiving an approved payout.</p></div><div className="process-panel"><div className="process-shine" aria-hidden="true" />{steps.map(({icon:Icon,title,text},index) => <article className="process-step" key={title}><div className="process-top"><span className="process-icon"><Icon size={22} /></span><span className="process-action">{['Choose','Prove','Earn'][index]}</span></div><div><h3>{title}</h3><p>{text}</p></div>{index < steps.length - 1 && <span className="process-connector" aria-hidden="true"><ArrowRight size={18} /></span>}</article>)}</div></div></section>
    <section id="features" className="section worker-section"><div className="page-container worker-layout"><div className="worker-visual"><div className="task-ticket ticket-one"><span className="ticket-platform"><Image src="/brands/instagram.svg" alt="" width={20} height={20} /> Instagram</span><strong>Comment on a post</strong><div><span>Worker earns</span><b>₦25</b></div></div><div className="task-ticket ticket-two"><span className="ticket-platform"><Image src="/brands/youtube.svg" alt="" width={20} height={20} /> YouTube</span><strong>Subscribe to a channel</strong><div><span>Worker earns</span><b>₦150</b></div></div><div className="ticket-stamp"><BadgeCheck size={28} /><span>Clear price.<br />Clear action.</span></div></div><div className="worker-copy"><span className="eyebrow">Made for earners</span><h2>Work that respects your time and data.</h2><p>Erna never charges you to unlock earning. Browse real actions, see the value and decide what fits your day.</p><div className="check-list"><span><Check size={18} /> ₦10 minimum task payout</span><span><Check size={18} /> One clear proof and review flow</span><span><Check size={18} /> Visible withdrawal status tracking</span></div><a className="arrow-link" href="#get-started">Explore earning on Erna <ArrowRight size={18} /></a></div></div></section>
    <section id="businesses" className="section business-section"><div className="page-container business-layout"><div className="business-copy"><span className="eyebrow">Made for advertisers</span><h2>Fund real actions, not vague promises.</h2><p>Choose the platform, action, quantity and budget. Your task goes live only after it is funded, so workers know the money is there.</p><a className="button button-light" href="#get-started">Create a campaign <ArrowRight size={18} /></a></div><div className="business-metrics"><div><Megaphone size={23} /><strong>Real social reach</strong><span>Run focused engagement tasks across the platforms your audience already uses.</span></div><div><ShieldCheck size={23} /><strong>Proof on every task</strong><span>Review submissions and flag invalid or duplicate work.</span></div><div><CircleDollarSign size={23} /><strong>Predictable spend</strong><span>Set a fixed quantity and know the full campaign cost upfront.</span></div></div></div></section>
    <section id="pricing" className="section pricing-section"><div className="page-container"><div className="pricing-intro"><span className="eyebrow">Transparent task pricing</span><h2>See what every action is worth.</h2><p>Workers see their exact earning. Advertisers see the exact task price. Erna never deducts a platform fee from an approved worker payout.</p></div><div className="rate-grid">{pricing.map(item => <article className={`rate-card ${item.className}`} key={item.platform}><header className="rate-card-header"><div className="rate-brand-icons">{item.icons.map(icon => <Image src={icon} alt="" width={24} height={24} key={icon} />)}</div><div><span>Platform</span><h3>{item.platform}</h3></div></header><div className="rate-actions">{item.actions.map(action => <div className="rate-action" key={action.name}><strong>{action.name}</strong><div className="rate-pair"><span><small>Worker gets</small><b>{action.worker}</b></span><span><small>Advertiser pays</small><b>{action.advertiser}</b></span></div></div>)}</div></article>)}</div><div className="pricing-note"><BadgeCheck size={18} /><span>The worker amount shown is the full approved payout. No earning fee is removed.</span><a className="arrow-link" href="#get-started">View tasks <ArrowRight size={18} /></a></div></div></section>
    <section id="referrals" className="section referral-section"><div className="page-container referral-layout"><div className="referral-copy"><span className="eyebrow">Refer & earn</span><h2>Bring a friend. Earn ₦300 when they get started.</h2><p>Share your personal referral code. When your friend completes their first approved task, your referral reward is added to your Erna wallet.</p><div className="referral-guard"><ShieldCheck size={18} /><span>Single-tier rewards only. You earn from direct referrals, never referral chains.</span></div><a className="button button-primary" href="#get-started">Get your referral code <ArrowRight size={18} /></a></div><div className="referral-ticket"><div className="referral-ticket-top"><span><UsersRound size={20} /> Direct referral</span><Share2 size={20} /></div><div className="referral-reward"><small>Your reward</small><strong>₦300</strong><span>after their first approved task</span></div><div className="referral-flow"><span>You share</span><ArrowRight size={16} /><span>Friend earns</span><ArrowRight size={16} /><b>You earn</b></div></div></div></section>
    <section id="faq" className="section faq-section"><div className="page-container faq-layout"><div className="section-heading"><span className="eyebrow">Questions, answered</span><h2>Know exactly what you are joining.</h2></div><div className="faq-list">{[['Do I pay to start earning?','No. There is no activation fee and no paid task-access tier. Create an account, verify it and start browsing opportunities.'],['How quickly can I withdraw?','Erna publishes a 24-48 hour withdrawal SLA. Every request has a visible Requested, Processing, Paid or Failed status.'],['How are task payouts protected?','Advertisers fund a task before it goes live. The campaign budget is held in escrow and approved work is credited from that funded balance.'],['How does the referral reward work?','Share your referral code. You receive ₦300 after your direct referral completes their first approved task. The program is single-tier only.']].map(([question,answer],index) => <details key={question} open={index===0}><summary>{question}<ChevronDown size={20} /></summary><p>{answer}</p></details>)}</div></div></section>
    <section id="get-started" className="final-cta"><div className="page-container final-cta-inner"><div><span className="eyebrow">Start with zero fees</span><h2>Ready to make your next move count?</h2></div><div><p>Earn from verified actions or put your campaign in front of real people.</p><a className="button button-primary" href="#top">Join Erna for free <ArrowRight size={18} /></a></div></div></section>
    <footer className="site-footer"><div className="page-container footer-grid"><div className="footer-brand"><a href="#top" aria-label="Erna home"><Brand /></a><p>Transparent digital tasks for Nigerians and the advertisers growing with them.</p></div><div><strong>Platform</strong><a href="#how-it-works">How it works</a><a href="#features">For workers</a><a href="#businesses">For advertisers</a><a href="#pricing">Pricing</a><a href="#referrals">Refer & earn</a></div><div><strong>Company</strong><a href="/about">About</a><a href="/trust">Trust & safety</a><a href="/contact">Customer care</a></div><div><strong>Support</strong><a href="#faq">FAQ</a><a href="/contact">Get help</a><a href="/trust">Report a concern</a></div><div className="footer-bottom"><span>© 2026 Erna Technologies</span><span>Built for clear work and fair value.</span></div></div></footer>
    <StickyMobileCta />
  </main>
}
