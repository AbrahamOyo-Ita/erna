import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOpenWaSignature } from '@/lib/openwa-webhook'

function acknowledge(value: unknown) {
  if (typeof value === 'number') return value >= 3 ? 'read' : value >= 2 ? 'delivered' : null
  const status = String(value ?? '').toLowerCase()
  if (status.includes('read')) return 'read'
  if (status.includes('deliver')) return 'delivered'
  return null
}

export async function POST(request: Request) {
  const secret = process.env.OPENWA_WEBHOOK_SECRET ?? ''
  const supplied = request.headers.get('x-openwa-signature') ?? ''
  const raw = await request.text()
  if (!verifyOpenWaSignature(raw, supplied, secret)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  try {
    const body = JSON.parse(raw) as {
      event?: string
      sessionId?: string
      deliveryId?: string
      idempotencyKey?: string
      data?: Record<string, unknown>
    }
    const event = String(body.event ?? '')
    const sessionId = String(body.sessionId ?? '')
    const deliveryId = String(body.deliveryId ?? body.idempotencyKey ?? '')
    const providerMessageId = String(body.data?.id ?? body.data?.messageId ?? '')
    if (!['message.sent', 'message.ack', 'message.failed'].includes(event) || !deliveryId || !providerMessageId) {
      return NextResponse.json({ error: 'Unsupported event' }, { status: 400 })
    }
    if (!process.env.OPENWA_SESSION_ID || sessionId !== process.env.OPENWA_SESSION_ID) {
      return NextResponse.json({ error: 'Unknown session' }, { status: 403 })
    }

    const ack = acknowledge(body.data?.ackName ?? body.data?.status ?? body.data?.ack)
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('apply_whatsapp_webhook', {
      p_delivery_id: deliveryId,
      p_event: event,
      p_provider_message_id: providerMessageId,
      p_ack: ack,
    })
    if (error) throw error
    return NextResponse.json({ received: true, duplicate: data === false })
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
  }
}
