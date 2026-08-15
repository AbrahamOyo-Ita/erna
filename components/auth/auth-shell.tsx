import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, LockKeyhole, ShieldCheck } from 'lucide-react'
import ernaLogo from '../../Erna-Logo.png'

export function AuthShell({ children, title, description, compact = false }: Readonly<{ children: React.ReactNode; title: string; description: string; compact?: boolean }>) {
  return <main className={`auth-page${compact ? ' auth-page-compact' : ''}`}>
    <section className="auth-story" aria-label="Why people trust Erna">
      <Link href="/" className="auth-logo" aria-label="Erna home"><span className="brand-logo-frame"><Image className="brand-logo-image" src={ernaLogo} alt="Erna" priority /></span></Link>
      <div className="auth-story-copy"><span className="auth-kicker">Work with clarity</span><h1>Start free.<br /><span>Earn with proof.</span></h1><p>Join a task platform built around funded work, transparent payouts and visible withdrawal progress.</p></div>
      <div className="auth-trust-list"><span><ShieldCheck size={18} /><b>No activation fee</b></span><span><BadgeCheck size={18} /><b>Verified task flow</b></span><span><LockKeyhole size={18} /><b>Secure account access</b></span></div>
    </section>
    <section className="auth-panel"><div className="auth-card"><div className="auth-card-heading"><Link href="/" className="auth-mobile-logo" aria-label="Erna home"><span className="brand-logo-frame"><Image className="brand-logo-image" src={ernaLogo} alt="Erna" priority /></span></Link><h2>{title}</h2><p>{description}</p></div>{children}</div></section>
  </main>
}
