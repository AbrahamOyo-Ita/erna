import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError,assertSameOrigin,consumeLimit,requireUser,ApiError } from '@/lib/server/request'
import { asText, normalizeNigerianPhone } from '@/lib/server/validation'

export async function PATCH(request:Request){try{
 assertSameOrigin(request);const user=await requireUser();await consumeLimit(user.id,'profile:update',10,3600)
 const body=await request.json(),fullName=asText(body.fullName,2,120,'Full name')
 const phone=body.phone?String(body.phone).replace(/[^0-9+]/g,''):null
 if(phone&&!/^\+?[0-9]{10,15}$/.test(phone))throw new ApiError(400,'Enter a valid phone number.')
 const whatsappOptIn=body.whatsappOptIn===true
 const whatsappPhone=whatsappOptIn?normalizeNigerianPhone(body.whatsappPhone??phone):null
 const admin=createAdminClient()
 const current=await admin.from('profiles').select('notification_preferences,whatsapp_opted_in_at').eq('id',user.id).single()
 if(current.error)throw current.error
 const preferences={...(current.data.notification_preferences??{}),whatsapp:whatsappOptIn}
 const result=await admin.from('profiles').update({
  full_name:fullName,
  phone,
  whatsapp_phone:whatsappPhone,
  whatsapp_opted_in_at:whatsappOptIn?(current.data.whatsapp_opted_in_at??new Date().toISOString()):null,
  notification_preferences:preferences,
 }).eq('id',user.id).select('full_name,phone,whatsapp_phone,whatsapp_opted_in_at,notification_preferences').single()
 if(result.error)throw result.error;return NextResponse.json(result.data)
}catch(error){return apiError(error)}}
