import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin, ShoppingBag } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { ContentHero } from '@/components/marketing/content-page'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Erna Marketplace | Discover Nigerian Products and Services', description: 'Browse active Erna marketplace listings and contact Nigerian sellers directly on WhatsApp.' }

type Listing = { id: string; title: string; category: string; price: number; city: string; state: string; listing_images: Array<{ storage_path: string; sort_order: number }> }
const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const category = (await searchParams).category?.trim() ?? ''
  const supabase = await createClient()
  let listings: Listing[] = []
  if (supabase) {
    let query = supabase.from('listings').select('id,title,category,price,city,state,listing_images(storage_path,sort_order)').eq('status', 'active').order('created_at', { ascending: false }).limit(60)
    if (category) query = query.eq('category', category)
    const result = await query
    listings = (result.data ?? []) as Listing[]
  }
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return <MarketingShell ctaLabel="Create a listing"><ContentHero current="Marketplace" eyebrow="Nigeria marketplace" title={category ? `${category} listings on Erna.` : 'Discover products and services from Erna sellers.'} copy="Listings use sanitized images and direct WhatsApp contact. Confirm the item before paying because Erna does not process marketplace payments." action="Create a listing" /><section className="section phase4-section"><div className="page-container public-market-grid">{listings.length ? listings.map(listing => { const image = [...listing.listing_images].sort((a, b) => a.sort_order - b.sort_order)[0]; return <article key={listing.id}><Link href={`/marketplace/${listing.id}`}>{image && storageUrl ? <Image src={`${storageUrl}/storage/v1/object/public/listing-images/${image.storage_path}`} alt={`${listing.title}, an Erna marketplace listing in ${listing.city}`} width={640} height={480} sizes="(max-width: 760px) 100vw, 33vw" /> : <span className="public-market-fallback"><ShoppingBag aria-hidden="true" /></span>}<small>{listing.category}</small><h2>{listing.title}</h2><strong>{money(listing.price)}</strong><p><MapPin aria-hidden="true" />{listing.city}, {listing.state}</p><span className="arrow-link">View listing <ArrowRight size={16} /></span></Link></article> }) : <div className="public-market-empty"><ShoppingBag aria-hidden="true" /><h2>No active listings found.</h2><p>Try the full marketplace or create the first listing in this category.</p><Link className="button button-secondary" href="/marketplace">View all listings</Link></div>}</div></section></MarketingShell>
}
