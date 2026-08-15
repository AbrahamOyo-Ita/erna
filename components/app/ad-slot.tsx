'use client'
import Script from 'next/script'
import { useEffect } from 'react'
type Props={client:string;slot:string;label:string}
export function AdSlot({client,slot,label}:Props){useEffect(()=>{if(client&&slot){try{const adWindow=window as unknown as Window&{adsbygoogle?:unknown[]};adWindow.adsbygoogle=adWindow.adsbygoogle??[];adWindow.adsbygoogle.push({})}catch{}}},[client,slot]);if(!client||!slot)return null;return <aside className="ad-shell" aria-label={label}><Script async strategy="afterInteractive" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`} crossOrigin="anonymous"/><span>Advertisement</span><ins className="adsbygoogle" style={{display:'block'}} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/></aside>}
