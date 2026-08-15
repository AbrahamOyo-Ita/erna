import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyOpenWaSignature(raw: string, supplied: string, secret: string) {
  if (!raw || !supplied || !secret) return false
  const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`
  return expected.length === supplied.length && timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
}
