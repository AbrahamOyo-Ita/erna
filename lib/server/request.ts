import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export class ApiError extends Error { constructor(public status:number,message:string){super(message)} }

export function assertSameOrigin(request:Request){
 const origin=request.headers.get('origin')
 const expected=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,'')??new URL(request.url).origin
 if(!origin||origin.replace(/\/$/,'')!==expected) throw new ApiError(403,'Invalid request origin')
}

export function assertContentLength(request:Request,maxBytes:number){
 const value=request.headers.get('content-length')
 if(value===null)return
 if(!/^[0-9]+$/.test(value)||Number(value)>maxBytes)throw new ApiError(413,'The uploaded request is too large.')
}

export async function requireUser():Promise<User>{
 const supabase=await createClient(); if(!supabase) throw new ApiError(503,'Supabase is not configured')
 const [{data:{user},error},{data:claimsData,error:claimsError}]=await Promise.all([supabase.auth.getUser(),supabase.auth.getClaims()])
 if(error||!user) throw new ApiError(401,'Your session has expired. Please sign in again.')
 const sessionId=String(claimsData?.claims?.session_id??'')
 if(claimsError||!/^[0-9a-f-]{36}$/i.test(sessionId))throw new ApiError(401,'Your session has expired. Please sign in again.')
 const admin=createAdminClient()
 const [active,profile]=await Promise.all([
  admin.rpc('is_active_auth_session',{p_user:user.id,p_session:sessionId}),
  admin.from('profiles').select('is_suspended').eq('id',user.id).single(),
 ])
 if(active.error||!active.data)throw new ApiError(401,'This session is no longer active. Please sign in again.')
 if(profile.error||!profile.data||profile.data.is_suspended)throw new ApiError(403,'This account is unavailable. Contact Erna support.')
 return user
}

export async function requireAdmin(){
 const user=await requireUser(); const admin=createAdminClient()
 const {data,error}=await admin.from('profiles').select('is_admin,is_suspended').eq('id',user.id).single()
 if(error||!data?.is_admin||data.is_suspended) throw new ApiError(403,'Admin authorization required')
 return {user,admin}
}

export async function consumeLimit(userId:string,action:string,limit:number,windowSeconds:number){
 const admin=createAdminClient(); const {data,error}=await admin.rpc('consume_rate_limit',{p_user:userId,p_action:action,p_limit:limit,p_window_seconds:windowSeconds})
 if(error) throw error; if(!data) throw new ApiError(429,'Too many requests. Please wait and try again.')
}

export function apiError(error:unknown){
 const message=error instanceof Error?error.message:'Unexpected server error'
 const status=error instanceof ApiError?error.status:/authorization required|priority access|account unavailable|suspended/i.test(message)?403:/duplicate|already|no remaining|unavailable/i.test(message)?409:/invalid|required|minimum|insufficient|limit/i.test(message)?400:500
 return NextResponse.json({error:status===500?'The request could not be completed. Please try again.':message},{status})
}
