import { createErnaOgImage, ogSize } from '@/lib/og-image'
export const alt = 'Erna customer care for account, task and payout help'
export const size = ogSize
export const contentType = 'image/png'
export default function Image() { return createErnaOgImage('Customer care', 'A clear route for task, account and payout help.') }
