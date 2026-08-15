'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import ernaLogo from '../../Erna-Logo.png'

export function MarketingBrand() {
  return <span className="brand-logo-frame"><Image className="brand-logo-image" src={ernaLogo} alt="Erna" priority /></span>
}

export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [
    { href: '/how-it-works', label: 'How it works' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
    { href: '/trust', label: 'Trust & safety' },
    { href: '/case-studies', label: 'Stories' },
    { href: '/faq', label: 'FAQ' },
  ]

  return <header className="site-header marketing-header">
    <Link href="/" className="brand-link" aria-label="Erna home"><MarketingBrand /></Link>
    <nav className="desktop-nav" aria-label="Main navigation">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
    <div className="header-actions"><Link className="text-link" href="/login">Log in</Link><Link className="button button-primary button-small" href="/signup">Join Erna <ArrowRight size={16} /></Link></div>
    <button className="menu-button" type="button" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-controls="marketing-mobile-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
    {menuOpen && <nav id="marketing-mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}<Link href="/contact" onClick={() => setMenuOpen(false)}>Customer care</Link><Link className="button button-primary" href="/signup" onClick={() => setMenuOpen(false)}>Join Erna</Link></nav>}
  </header>
}

export function MarketingFooter() {
  return <footer className="site-footer"><div className="page-container footer-grid"><div className="footer-brand"><Link href="/" aria-label="Erna home"><MarketingBrand /></Link><p>Transparent digital tasks for Nigerians and the advertisers growing with them.</p></div><div><strong>Platform</strong><Link href="/how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/case-studies">Illustrative stories</Link><Link href="/faq">FAQ</Link></div><div><strong>Company</strong><Link href="/about">About</Link><Link href="/trust">Trust & safety</Link><Link href="/contact">Customer care</Link></div><div><strong>Start</strong><Link href="/signup">Join Erna</Link><Link href="/signup">Post a task</Link><Link href="/#referrals">Refer & earn</Link></div><div className="footer-bottom"><span>© 2026 Erna Technologies</span><span>Built for clear work and fair value.</span></div></div></footer>
}

export function StickyMobileCta({ label = 'Start earning', href = '/signup' }: { label?: string; href?: string }) {
  return <div className="sticky-mobile-cta"><Link href={href}>{label}<ArrowRight size={16} /></Link></div>
}

export function MarketingShell({ children, ctaLabel, ctaHref }: Readonly<{ children: React.ReactNode; ctaLabel?: string; ctaHref?: string }>) {
  return <main><MarketingHeader />{children}<MarketingFooter /><StickyMobileCta label={ctaLabel} href={ctaHref} /></main>
}
