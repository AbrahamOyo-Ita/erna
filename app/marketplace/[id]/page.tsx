import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, MessageCircle, ShieldCheck, Star } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'

type Listing = {
  id: string
  title: string
  description: string
  category: string
  price: number
  state: string
  city: string
  whatsapp_phone: string
  seller_id: string
  listing_images: Array<{ storage_path: string; sort_order: number }>
  seller_ratings: Array<{ rating: number }>
}

const money = (value: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
}).format(value)

export async function generateMetadata({ params }: PageProps<'/marketplace/[id]'>): Promise<Metadata> {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: 'Marketplace Listing' }
  const supabase = await createClient()
  if (!supabase) return { title: 'Marketplace Listing' }
  const { data } = await supabase.from('listings').select('title,description,city,state,listing_images(storage_path,sort_order)').eq('id', id).eq('status', 'active').maybeSingle()
  if (!data) return { title: 'Marketplace Listing' }
  const image = [...(data.listing_images as Array<{ storage_path: string; sort_order: number }>)].sort((a, b) => a.sort_order - b.sort_order)[0]
  const imageUrl = image && process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${image.storage_path}` : undefined
  return { title: `${data.title} in ${data.city}`, description: String(data.description).slice(0, 155), openGraph: { title: data.title, description: `${data.title} in ${data.city}, ${data.state}.`, images: imageUrl ? [{ url: imageUrl, alt: `${data.title}, an Erna marketplace listing in ${data.city}` }] : undefined } }
}

export default async function MarketplaceListingPage({ params }: PageProps<'/marketplace/[id]'>) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const supabase = await createClient()
  if (!supabase) notFound()
  const { data, error } = await supabase
    .from('listings')
    .select('id,title,description,category,price,state,city,whatsapp_phone,seller_id,listing_images(storage_path,sort_order),seller_ratings(rating)')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data) notFound()

  const listing = data as Listing
  const images = [...listing.listing_images].sort((a, b) => a.sort_order - b.sort_order)
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const imageUrl = (path: string) => `${storageUrl}/storage/v1/object/public/listing-images/${path}`
  const rating = listing.seller_ratings.length
    ? listing.seller_ratings.reduce((sum, item) => sum + item.rating, 0) / listing.seller_ratings.length
    : null
  const whatsapp = `https://wa.me/${listing.whatsapp_phone}?text=${encodeURIComponent(`Hello, I saw ${listing.title} on Erna.`)}`
  const related = await supabase.from('listings').select('id,title').eq('seller_id', listing.seller_id).eq('status', 'active').neq('id', id).limit(3)

  return <MarketingShell>
    <section className={styles.hero}>
      <div className={`page-container ${styles.breadcrumb}`}>
        <Link href="/"><ArrowLeft size={16} />Home</Link>
        <span>/</span><Link href="/marketplace">Marketplace</Link><span>/</span><Link href={`/marketplace?category=${encodeURIComponent(listing.category)}`}>{listing.category}</Link><span>/</span><strong>{listing.title}</strong>
      </div>
      <div className={`page-container ${styles.layout}`}>
        <div className={styles.gallery}>
          {images.length ? images.map((image, index) => <div className={index === 0 ? styles.primaryImage : styles.secondaryImage} key={image.storage_path}>
            <Image
              src={imageUrl(image.storage_path)}
              alt={`${listing.title}${index === 0 ? ` marketplace listing in ${listing.city}` : ` detail ${index + 1}`}`}
              width={1200}
              height={900}
              priority={index === 0}
              sizes={index === 0 ? '(max-width: 820px) 100vw, 58vw' : '(max-width: 820px) 50vw, 28vw'}
            />
          </div>) : <div className={styles.imageFallback}>Erna marketplace</div>}
        </div>
        <article className={styles.details}>
          <span className={styles.category}>{listing.category}</span>
          <h1>{listing.title}</h1>
          <strong className={styles.price}>{money(listing.price)}</strong>
          <p className={styles.location}><MapPin size={17} />{listing.city}, {listing.state}</p>
          {rating === null
            ? <p className={styles.rating}><Star size={16} />New seller - no ratings yet</p>
            : <p className={styles.rating}><Star size={16} fill="currentColor" />{rating.toFixed(1)} from {listing.seller_ratings.length} rating{listing.seller_ratings.length === 1 ? '' : 's'}</p>}
          <div className={styles.description}><h2>About this listing</h2><p>{listing.description}</p></div>
          <a className={styles.whatsapp} href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} />Contact seller on WhatsApp</a>
          <div className={styles.safety}><ShieldCheck size={19} /><p><strong>Trade thoughtfully</strong><span>Confirm the item or service before sending money. Erna does not collect marketplace payments.</span></p></div>
          {(related.data?.length ?? 0) > 0 && <div className={styles.related}><h2>More from this seller</h2>{related.data?.map(item => <Link href={`/marketplace/${item.id}`} key={item.id}>{item.title}</Link>)}</div>}
        </article>
      </div>
    </section>
  </MarketingShell>
}
