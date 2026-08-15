import { createErnaOgImage, ogSize } from '@/lib/og-image'
export const alt = 'About Erna and its trust-first task platform mission'
export const size = ogSize
export const contentType = 'image/png'
export default function Image() { return createErnaOgImage('About Erna', 'A fairer foundation for small digital work.') }
