import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return {
    rules: [{ userAgent: '*', allow: ['/', '/about', '/trust', '/contact', '/how-it-works', '/pricing', '/faq', '/case-studies', '/marketplace', '/marketplace/'], disallow: ['/app', '/admin', '/api/', '/auth/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify', '/thank-you'] }],
    sitemap: `${base}/sitemap.xml`,
  }
}
