import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError,assertSameOrigin,consumeLimit,requireUser,ApiError } from '@/lib/server/request'

export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{
 assertSameOrigin(request);const user=await requireUser();await consumeLimit(user.id,'advertiser:review',120,3600)
 const {id}=await context.params;if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'Invalid submission.')
 const body=await request.json(),decision=body.decision==='approved'?'approved':body.decision==='rejected'?'rejected':null
 if(!decision)throw new ApiError(400,'Choose approve or reject.')
 const admin=createAdminClient(),result=await admin.rpc('review_submission',{p_actor:user.id,p_submission:id,p_decision:decision,p_reason:body.reason??null,p_note:body.note??null})
 if(result.error)throw result.error;return NextResponse.json(result.data)
}catch(error){return apiError(error)}}
