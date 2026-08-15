import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/auth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeNextPath(url.searchParams.get('next'))
  const supabase = await createClient()

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
  }

  const loginUrl = new URL('/login', url.origin)
  loginUrl.searchParams.set('error', 'The secure link is invalid or has expired.')
  return NextResponse.redirect(loginUrl)
}
