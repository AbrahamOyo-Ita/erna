import { createErnaOgImage, ogSize } from '@/lib/og-image'
export const alt = 'Erna, clear digital tasks and honest payouts'
export const size = ogSize
export const contentType = 'image/png'
export default function Image() { return createErnaOgImage('Earn with proof', 'Clear digital tasks. Honest, trackable payouts.') }
