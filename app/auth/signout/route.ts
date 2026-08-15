import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, assertSameOrigin } from '@/lib/server/request'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const supabase = await createClient()
    if (supabase) await supabase.auth.signOut({ scope: 'global' })
    return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  } catch (error) {
    return apiError(error)
  }
}
