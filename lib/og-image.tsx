import { ImageResponse } from 'next/og'

export const ogSize = { width: 1200, height: 630 }

export function createErnaOgImage(kicker: string, title: string) {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '70px 76px', color: '#ffffff', background: 'linear-gradient(145deg,#062e1b 0%,#0c512b 58%,#116c36 100%)', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 34, fontWeight: 800 }}><span style={{ display: 'flex', width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 18, color: '#07371f', background: '#b9ee72' }}>E</span>Erna</div>
        <span style={{ padding: '12px 18px', border: '1px solid rgba(255,255,255,.24)', borderRadius: 999, color: '#d9ebdf', fontSize: 18 }}>Nigeria’s trust-first task platform</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}><span style={{ color: '#b9ee72', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3 }}>{kicker}</span><div style={{ display: 'flex', maxWidth: 980, fontSize: 68, fontWeight: 800, lineHeight: 1.03, letterSpacing: -3 }}>{title}</div></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#bdd2c4', fontSize: 20 }}><span>No activation fee</span><span>Funded work</span><span>Tracked payouts</span></div>
    </div>,
    ogSize,
  )
}
