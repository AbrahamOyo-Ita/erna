import { createErnaOgImage, ogSize } from '@/lib/og-image'
export const alt = 'Illustrative Erna use cases for workers, advertisers and sellers'
export const size = ogSize
export const contentType = 'image/png'
export default function Image() { return createErnaOgImage('Illustrative use cases', 'Three ways Erna can fit real work.') }
