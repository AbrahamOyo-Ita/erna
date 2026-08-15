export type ConversionEvent = 'signup_complete' | 'first_task_completion' | 'first_withdrawal' | 'advertiser_task_funded'

export function trackConversion(name: ConversionEvent, parameters: Record<string, string | number | boolean> = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('erna:conversion', { detail: { name, parameters } }))
}
