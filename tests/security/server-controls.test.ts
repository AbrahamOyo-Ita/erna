import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import sharp from 'sharp'

import { verifyPaystackSignature } from '../../lib/paystack-webhook'
import { sanitizeImage } from '../../lib/server/images'
import {
  asHttpsUrl,
  asMoney,
  bankAccount,
  normalizeNigerianPhone,
} from '../../lib/server/validation'
import { ApiError, assertContentLength, assertSameOrigin } from '../../lib/server/request'
import { safeNextPath } from '../../lib/auth'
import { adExposure, effectivePlan } from '../../lib/server/plans'
import { renderWhatsAppMessage, toOpenWaChatId } from '../../lib/openwa'
import { verifyOpenWaSignature } from '../../lib/openwa-webhook'

function upload(buffer: Buffer, type: string) {
  return {
    type,
    size: buffer.byteLength,
    arrayBuffer: async () => buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  } as File
}

test('Paystack signatures require the exact raw body and secret', () => {
  const raw = JSON.stringify({ event: 'charge.success', data: { reference: 'erna_123' } })
  const secret = 'sk_test_qa_only'
  const signature = createHmac('sha512', secret).update(raw).digest('hex')

  assert.equal(verifyPaystackSignature(raw, signature, secret), true)
  assert.equal(verifyPaystackSignature(`${raw} `, signature, secret), false)
  assert.equal(verifyPaystackSignature(raw, signature, `${secret}_wrong`), false)
  assert.equal(verifyPaystackSignature(raw, 'short', secret), false)
})

test('OpenWA signatures require the exact raw body and sha256 prefix', () => {
  const raw = JSON.stringify({ event: 'message.ack', deliveryId: 'delivery_1' })
  const secret = 'openwa_webhook_test_secret'
  const signature = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`
  assert.equal(verifyOpenWaSignature(raw, signature, secret), true)
  assert.equal(verifyOpenWaSignature(`${raw} `, signature, secret), false)
  assert.equal(verifyOpenWaSignature(raw, signature.slice(7), secret), false)
  assert.equal(verifyOpenWaSignature(raw, '', secret), false)
})

test('OpenWA recipient and template rendering stay in the approved product-alert lane', () => {
  assert.equal(toOpenWaChatId('0816 285 1706'), '2348162851706@c.us')
  const message = renderWhatsAppMessage({ template: 'task_rejected', payload: { title: 'Task needs attention', body: 'Review the reason in Erna.' } })
  assert.match(message, /Task needs attention/)
  assert.match(message, /Manage WhatsApp alerts/)
  assert.doesNotMatch(message, /OTP|bank account|withdrawal paid/i)
})

test('same-origin enforcement rejects missing and cross-site origins', () => {
  assert.doesNotThrow(() => assertSameOrigin(new Request('https://erna.example/api/tasks', {
    method: 'POST',
    headers: { origin: 'https://erna.example' },
  })))

  for (const headers of [new Headers(), new Headers({ origin: 'https://attacker.example' })]) {
    assert.throws(
      () => assertSameOrigin(new Request('https://erna.example/api/tasks', { method: 'POST', headers })),
      (error: unknown) => error instanceof ApiError && error.status === 403,
    )
  }
})

test('post-auth redirects accept only normalized same-origin paths', () => {
  assert.equal(safeNextPath('/app?section=wallet'), '/app?section=wallet')
  assert.equal(safeNextPath('/reset-password#form'), '/reset-password#form')

  for (const value of [
    '//attacker.example',
    '/\\attacker.example',
    '/%2f%2fattacker.example',
    '/%5c%5cattacker.example',
    'https://attacker.example',
    'javascript:alert(1)',
    '/app\u0000javascript:alert(1)',
    '/%not-valid',
  ]) assert.equal(safeNextPath(value), '/app')
})

test('request size guard rejects oversized declared bodies', () => {
  assert.doesNotThrow(() => assertContentLength(new Request('https://erna.example/upload', {
    method: 'POST', headers: { 'content-length': '1024' }, body: 'x',
  }), 2048))
  assert.throws(
    () => assertContentLength(new Request('https://erna.example/upload', {
      method: 'POST', headers: { 'content-length': '4096' }, body: 'x',
    }), 2048),
    (error: unknown) => error instanceof ApiError && error.status === 413,
  )
})

test('server plan state gates ad exposure and ignores expired upgrades', () => {
  const future = new Date(Date.now() + 60_000).toISOString()
  const past = new Date(Date.now() - 60_000).toISOString()
  assert.equal(effectivePlan({ plan: 'plus', plan_expires_at: future }), 'plus')
  assert.equal(effectivePlan({ plan: 'pro', plan_expires_at: past }), 'free')
  assert.deepEqual(adExposure('free'), { taskFeed: true, wallet: true, marketplace: true })
  assert.deepEqual(adExposure('plus'), { taskFeed: false, wallet: true, marketplace: true })
  assert.deepEqual(adExposure('pro'), { taskFeed: false, wallet: false, marketplace: false })
})

test('server validators reject malformed financial and identity inputs', () => {
  assert.equal(asHttpsUrl('https://example.com/task'), 'https://example.com/task')
  assert.throws(() => asHttpsUrl('http://example.com/task'))
  assert.throws(() => asHttpsUrl('https://user:password@example.com/task'))

  assert.equal(asMoney('1000.25', 100, 1_000_000), 1000.25)
  assert.throws(() => asMoney('1000.001', 100, 1_000_000))
  assert.throws(() => asMoney(Number.NaN, 100, 1_000_000))

  assert.equal(bankAccount('0123456789'), '0123456789')
  assert.throws(() => bankAccount('01234'))
  assert.equal(normalizeNigerianPhone('0801 234 5678'), '2348012345678')
  assert.throws(() => normalizeNigerianPhone('+1 555 0100'))
})

test('image sanitizer decodes, bounds, re-encodes, and strips metadata', async () => {
  const source = await sharp({
    create: { width: 80, height: 60, channels: 3, background: '#0b6b3a' },
  }).withMetadata({ orientation: 6 }).jpeg().toBuffer()

  const result = await sanitizeImage(upload(source, 'image/jpeg'), 1024 * 1024, 64)
  const metadata = await sharp(result).metadata()

  assert.equal(metadata.format, 'webp')
  assert.ok((metadata.width ?? 0) <= 64)
  assert.ok((metadata.height ?? 0) <= 64)
  assert.equal(metadata.exif, undefined)
  assert.equal(metadata.icc, undefined)
})

test('image sanitizer rejects MIME spoofing, unsupported types, and oversized files', async () => {
  await assert.rejects(
    sanitizeImage(upload(Buffer.alloc(128, 1), 'image/jpeg'), 1024 * 1024, 1000),
    (error: unknown) => error instanceof ApiError && error.status === 415,
  )
  await assert.rejects(
    sanitizeImage(upload(Buffer.alloc(128, 1), 'image/svg+xml'), 1024 * 1024, 1000),
    (error: unknown) => error instanceof ApiError && error.status === 415,
  )
  await assert.rejects(
    sanitizeImage(upload(Buffer.alloc(2048, 1), 'image/png'), 1024, 1000),
    (error: unknown) => error instanceof ApiError && error.status === 413,
  )
})
