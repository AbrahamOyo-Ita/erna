import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { ConsentAnalytics } from '@/components/analytics/consent-analytics'
import './globals.css'

const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
const metadataBase = new URL(configuredUrl && /^https?:\/\//.test(configuredUrl) ? configuredUrl : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase,
  title: { default: 'Erna | Earn from Verified Digital Tasks in Nigeria', template: '%s | Erna' },
  description: 'Join Erna free, earn from verified digital tasks and withdraw on a clear 24-48 hour timeline.',
  generator: 'Erna',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'en_NG', siteName: 'Erna', title: 'Erna | Clear Tasks, Honest Payouts', description: 'Join free, complete funded digital tasks and track every approved naira.', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Erna, clear tasks and honest payouts' }] },
  twitter: { card: 'summary_large_image', title: 'Erna | Clear Tasks, Honest Payouts', description: 'Join free, complete funded digital tasks and track every approved naira.', images: ['/opengraph-image'] },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#116c36' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${metadataBase.origin}/#organization`, name: 'Erna', legalName: 'Aphiva Technologies Limited', url: metadataBase.origin, areaServed: { '@type': 'Country', name: 'Nigeria' }, email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || undefined },
      { '@type': 'WebApplication', '@id': `${metadataBase.origin}/#application`, name: 'Erna', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: metadataBase.origin, isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' }, provider: { '@id': `${metadataBase.origin}/#organization` } },
    ],
  }
  return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /><ConsentAnalytics />{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
