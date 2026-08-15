import { createErnaOgImage, ogSize } from '@/lib/og-image'
export const alt = 'How Erna funded tasks, proof review and payouts work'
export const size = ogSize
export const contentType = 'image/png'
export default function Image() { return createErnaOgImage('How it works', 'From funded task to tracked payout.') }
