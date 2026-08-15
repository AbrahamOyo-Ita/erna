import { createErnaOgImage, ogSize } from '@/lib/og-image'
export const alt = 'Erna worker rewards and advertiser task pricing'
export const size = ogSize
export const contentType = 'image/png'
export default function Image() { return createErnaOgImage('Published pricing', 'See the worker reward and campaign cost upfront.') }
