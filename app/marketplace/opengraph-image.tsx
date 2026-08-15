import { createErnaOgImage, ogSize } from '@/lib/og-image'
export const alt = 'Erna marketplace listings from Nigerian sellers'
export const size = ogSize
export const contentType = 'image/png'
export default function Image() { return createErnaOgImage('Erna marketplace', 'Discover products and contact sellers directly.') }
