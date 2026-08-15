import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError,assertSameOrigin,consumeLimit,requireUser,ApiError } from '@/lib/server/request'
import { asText } from '@/lib/server/validation'
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const user=await requireUser();await consumeLimit(user.id,'submission:appeal',5,86400);const {id}=await context.params;if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'Invalid submission.');const b=await request.json();const admin=createAdminClient();const {data,error}=await admin.rpc('appeal_submission',{p_user:user.id,p_submission:id,p_reason:asText(b.reason,10,1000,'Appeal reason')});if(error)throw error;return NextResponse.json({id:data,status:'open'},{status:201})}catch(error){return apiError(error)}}
