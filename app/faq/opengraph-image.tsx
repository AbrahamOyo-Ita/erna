import { createErnaOgImage, ogSize } from '@/lib/og-image'
export const alt = 'Answers to common questions about using Erna'
export const size = ogSize
export const contentType = 'image/png'
export default function Image() { return createErnaOgImage('Erna FAQ', 'Six straight answers about tasks, payouts and referrals.') }
