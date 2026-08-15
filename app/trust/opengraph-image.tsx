import { createErnaOgImage, ogSize } from '@/lib/og-image'
export const alt = 'Erna trust and safety protections for workers and advertisers'
export const size = ogSize
export const contentType = 'image/png'
export default function Image() { return createErnaOgImage('Trust and safety', 'Server-enforced controls around work and money.') }
