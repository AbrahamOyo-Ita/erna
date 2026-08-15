import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError,assertSameOrigin,consumeLimit,requireUser,ApiError } from '@/lib/server/request'

export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{
 assertSameOrigin(request);const user=await requireUser();await consumeLimit(user.id,'listing:boost',5,3600)
 const {id}=await context.params;if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'Invalid listing.')
 const body=await request.json(),quantity=Number(body.quantity)
 if(!Number.isInteger(quantity)||quantity<10||quantity>10000)throw new ApiError(400,'Boost quantity must be between 10 and 10,000.')
 const origin=(process.env.NEXT_PUBLIC_APP_URL??new URL(request.url).origin).replace(/\/$/,'')
 const admin=createAdminClient(),result=await admin.rpc('create_listing_boost',{p_user:user.id,p_listing:id,p_quantity:quantity,p_target_url:`${origin}/marketplace/${id}`})
 if(result.error)throw result.error;return NextResponse.json({taskId:result.data,status:'active'},{status:201})
}catch(error){return apiError(error)}}
