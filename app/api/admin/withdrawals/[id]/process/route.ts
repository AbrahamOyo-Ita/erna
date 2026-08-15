import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { paystack,PaystackError } from '@/lib/paystack'
import { apiError,assertSameOrigin,consumeLimit,requireAdmin,ApiError } from '@/lib/server/request'

type Transfer={data:{transfer_code:string;status:string;reference:string;gateway_response?:string;failures?:{reason?:string}}}
const terminal=new Set(['success','failed','reversed'])

async function reconcile(admin:SupabaseClient,reference:string){
 const result=await paystack<Transfer>(`/transfer/verify/${encodeURIComponent(reference)}`)
 const status=result.data.status
 if(terminal.has(status)){const finalized=await admin.rpc('finalize_withdrawal',{p_reference:reference,p_event:status,p_transfer_code:result.data.transfer_code??null,p_reason:result.data.failures?.reason??result.data.gateway_response??null});if(finalized.error)throw finalized.error}
 return {status:status==='success'?'paid':status,transferCode:result.data.transfer_code??null}
}

export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{
 assertSameOrigin(request);const {user,admin}=await requireAdmin();await consumeLimit(user.id,'admin:withdrawal',30,3600)
 const {id}=await context.params;if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'Invalid withdrawal.')
 const current=await admin.from('withdrawals').select('id,status,amount,recipient_code,reference,transfer_code').eq('id',id).single()
 if(current.error||!current.data)throw new ApiError(404,'Withdrawal not found.')
 if(current.data.status==='processing'){
  try{return NextResponse.json({id,...await reconcile(admin,current.data.reference),reference:current.data.reference})}
  catch(error){if(!(error instanceof PaystackError)||error.status!==404)throw error}
 }
 if(current.data.status!=='requested'&&current.data.status!=='processing')throw new ApiError(409,'Withdrawal is not awaiting transfer.')
 const prepared=current.data.status==='requested'?await admin.rpc('prepare_withdrawal_transfer',{p_admin:user.id,p_withdrawal:id}):{data:current.data,error:null}
 if(prepared.error)throw prepared.error;const w=prepared.data
 try{
  const result=await paystack<Transfer>('/transfer',{method:'POST',body:JSON.stringify({source:'balance',amount:Math.round(Number(w.amount)*100),recipient:w.recipient_code,reference:w.reference,reason:'Erna wallet withdrawal'})})
  const attached=await admin.rpc('attach_transfer_code',{p_withdrawal:id,p_transfer_code:result.data.transfer_code});if(attached.error)throw attached.error
  return NextResponse.json({id,status:'processing',reference:w.reference})
 }catch(error){
  if(error instanceof PaystackError&&(/reference.*(exists|used)/i.test(error.message)||error.retryable)){
   try{return NextResponse.json({id,...await reconcile(admin,w.reference),reference:w.reference})}catch(reconcileError){if(error.retryable)throw error;throw reconcileError}
  }
  if(error instanceof PaystackError&&!error.retryable){await admin.rpc('finalize_withdrawal',{p_reference:w.reference,p_event:'failed',p_transfer_code:null,p_reason:error.message})}
  throw error
 }
}catch(error){return apiError(error)}}

export async function DELETE(request:Request,context:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const {user,admin}=await requireAdmin();const {id}=await context.params;const body=await request.json();const result=await admin.rpc('reject_withdrawal',{p_admin:user.id,p_withdrawal:id,p_reason:String(body.reason??'')});if(result.error)throw result.error;return NextResponse.json(result.data)}catch(error){return apiError(error)}}
