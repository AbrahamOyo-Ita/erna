'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Script from 'next/script'

type Consent = 'accepted' | 'declined' | null
type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }

const cookieName = 'erna_analytics_consent'

function savedConsent(): Consent {
  if (typeof document === 'undefined') return null
  const value = document.cookie.split('; ').find(item => item.startsWith(`${cookieName}=`))?.split('=')[1]
  return value === 'accepted' || value === 'declined' ? value : null
}

function subscribe(callback: () => void) {
  window.addEventListener('erna:consent', callback)
  return () => window.removeEventListener('erna:consent', callback)
}

export function ConsentAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const consent = useSyncExternalStore(subscribe, savedConsent, () => null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    function conversion(event: Event) {
      if (consent !== 'accepted') return
      const detail = (event as CustomEvent<{ name: string; parameters: Record<string, unknown> }>).detail
      ;(window as GtagWindow).gtag?.('event', detail.name, detail.parameters)
    }
    window.addEventListener('erna:conversion', conversion)
    return () => window.removeEventListener('erna:conversion', conversion)
  }, [consent])

  function choose(next: Exclude<Consent, null>) {
    document.cookie = `${cookieName}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
    window.dispatchEvent(new Event('erna:consent'))
  }

  return <>
    {measurementId && consent === 'accepted' && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" onLoad={() => setReady(true)} />
      <Script id="erna-ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('consent','default',{'analytics_storage':'granted'});gtag('config','${measurementId}',{'anonymize_ip':true});`}</Script>
    </>}
    {!consent && <aside className="analytics-consent" aria-label="Analytics preference"><div><strong>Privacy-respecting analytics</strong><p>Allow anonymous usage measurement to help Erna improve signup, task and payout journeys. Advertising cookies are not enabled here.</p></div><div><button onClick={() => choose('declined')}>Decline</button><button className="accept" onClick={() => choose('accepted')}>Allow analytics</button></div></aside>}
    <span hidden aria-hidden="true">{ready ? 'Analytics ready' : ''}</span>
  </>
}
