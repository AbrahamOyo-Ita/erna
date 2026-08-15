import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const routes = ['', '/how-it-works', '/pricing', '/faq', '/case-studies', '/marketplace', '/about', '/trust', '/contact']
  return routes.map((route, index) => ({ url: `${base}${route}`, lastModified: new Date(), changeFrequency: index === 0 ? 'weekly' : 'monthly', priority: index === 0 ? 1 : .7 }))
}
