import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError,assertSameOrigin,requireUser,ApiError } from '@/lib/server/request'

export async function POST(request:Request){try{
 assertSameOrigin(request);const user=await requireUser(),supabase=await createClient();if(!supabase)throw new ApiError(503,'Supabase is not configured.')
 const result=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null)
 if(result.error)throw result.error;return NextResponse.json({updated:true})
}catch(error){return apiError(error)}}
