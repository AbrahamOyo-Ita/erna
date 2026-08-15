import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeNigerianPhone } from '@/lib/server/validation'

type WhatsAppTemplate = 'task_approved' | 'task_rejected' | 'new_task_available' | 'task_reminder' | 'daily_question'

type WhatsAppOutboxItem = {
  id: string
  recipient: string
  template: WhatsAppTemplate
  payload: Record<string, unknown>
  attempts: number
}

type OpenWaResponse = { messageId?: string; id?: string; timestamp?: number }

class OpenWaError extends Error {
  retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.name = 'OpenWaError'
    this.retryable = retryable
  }
}

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new OpenWaError(`${name} is not configured`, false)
  return value
}

function openWaConfig() {
  const baseUrl = new URL(required('OPENWA_BASE_URL'))
  const local = ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname)
  if (baseUrl.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && local)) {
    throw new OpenWaError('OPENWA_BASE_URL must use HTTPS outside local development', false)
  }

  return {
    baseUrl: baseUrl.toString().replace(/\/$/, ''),
    apiKey: required('OPENWA_API_KEY'),
    sessionId: required('OPENWA_SESSION_ID'),
    sender: normalizeNigerianPhone(required('OPENWA_SENDER_NUMBER')),
  }
}

export function toOpenWaChatId(phone: unknown) {
  return `${normalizeNigerianPhone(phone)}@c.us`
}

function appLink() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!configured) return ''
  try {
    return `${new URL(configured).toString().replace(/\/$/, '')}/app`
  } catch {
    return ''
  }
}

export function renderWhatsAppMessage(item: Pick<WhatsAppOutboxItem, 'template' | 'payload'>) {
  const title = String(item.payload.title ?? '').trim()
  const body = String(item.payload.body ?? '').trim()
  const fallback: Record<WhatsAppTemplate, [string, string]> = {
    task_approved: ['Task approved', 'Your proof was approved and your wallet has been updated.'],
    task_rejected: ['Task needs attention', 'Your proof was rejected. Open Erna to review the reason or appeal.'],
    new_task_available: ['A new Erna task is available', 'Open your task feed to review the instructions and reward.'],
    task_reminder: ['Your Erna task is waiting', 'Finish the task and submit valid proof before its slots are filled.'],
    daily_question: ['Today’s Erna question is ready', 'Complete an approved task today to unlock the daily question.'],
  }
  const [fallbackTitle, fallbackBody] = fallback[item.template]
  const link = appLink()
  return [`*${title || fallbackTitle}*`, body || fallbackBody, link, 'Manage WhatsApp alerts from your Erna profile.'].filter(Boolean).join('\n\n').slice(0, 4096)
}

export async function deliverWhatsAppItem(item: WhatsAppOutboxItem) {
  const config = openWaConfig()
  const response = await fetch(`${config.baseUrl}/api/sessions/${encodeURIComponent(config.sessionId)}/messages/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
      'Idempotency-Key': item.id,
    },
    body: JSON.stringify({
      chatId: toOpenWaChatId(item.recipient),
      text: renderWhatsAppMessage(item),
      linkPreview: false,
    }),
    signal: AbortSignal.timeout(12_000),
  })
  const data = await response.json().catch(() => ({})) as OpenWaResponse & { message?: string; error?: string }
  if (!response.ok) {
    const retryable = response.status === 409 || response.status === 408 || response.status === 429 || response.status >= 500
    throw new OpenWaError(data.message || data.error || `OpenWA rejected the message (${response.status})`, retryable)
  }
  const providerMessageId = String(data.messageId ?? data.id ?? '').trim()
  if (!providerMessageId) throw new OpenWaError('OpenWA did not return a message ID', true)
  return providerMessageId
}

export async function processWhatsAppOutbox(limit = 20) {
  if (process.env.OPENWA_ENABLED !== 'true') return { accepted: 0, failed: 0, suppressed: 0, disabled: true }

  const config = openWaConfig()
  if (config.sender !== '2348162851706') {
    throw new OpenWaError('OPENWA_SENDER_NUMBER does not match Erna’s dedicated notification number', false)
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('claim_whatsapp_outbox', { p_limit: limit })
  if (error) throw error

  let accepted = 0
  let failed = 0
  let suppressed = 0
  for (const item of (data ?? []) as WhatsAppOutboxItem[]) {
    try {
      const providerMessageId = await deliverWhatsAppItem(item)
      const result = await admin.from('whatsapp_outbox').update({
        status: 'accepted',
        provider_message_id: providerMessageId,
        accepted_at: new Date().toISOString(),
        last_error: null,
      }).eq('id', item.id).eq('status', 'processing')
      if (result.error) throw result.error
      accepted++
    } catch (error) {
      const retryable = !(error instanceof OpenWaError) || error.retryable
      const shouldSuppress = !retryable || item.attempts >= 6
      const delaySeconds = Math.min(3600, 60 * 2 ** Math.max(0, item.attempts - 1))
      const result = await admin.from('whatsapp_outbox').update({
        status: shouldSuppress ? 'suppressed' : 'failed',
        last_error: (error instanceof Error ? error.message : 'WhatsApp delivery failed').slice(0, 1000),
        available_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
      }).eq('id', item.id).eq('status', 'processing')
      if (result.error) throw result.error
      if (shouldSuppress) suppressed++
      else failed++
    }
  }

  return { accepted, failed, suppressed, disabled: false }
}
