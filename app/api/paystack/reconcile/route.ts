import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paystack } from '@/lib/paystack'
import { apiError,assertSameOrigin,consumeLimit,requireUser,ApiError } from '@/lib/server/request'

type Verification={data:{reference:string;amount:number;status:string;subscription?:{subscription_code?:string;email_token?:string;next_payment_date?:string}}}

export async function POST(request:Request){try{
 assertSameOrigin(request);const user=await requireUser();await consumeLimit(user.id,'paystack:reconcile',10,3600)
 const body=await request.json(),reference=String(body.reference??'')
 if(!/^erna-(fund|sub)-[0-9a-f-]{36}$/i.test(reference))throw new ApiError(400,'Invalid payment reference.')
 const admin=createAdminClient(),verified=await paystack<Verification>(`/transaction/verify/${encodeURIComponent(reference)}`)
 if(verified.data.status!=='success')return NextResponse.json({status:verified.data.status})
 const amount=Number(verified.data.amount)/100
 const intent=await admin.from('payment_intents').select('user_id,amount').eq('reference',reference).eq('user_id',user.id).maybeSingle()
 if(intent.error)throw intent.error
 if(intent.data){if(Number(intent.data.amount)!==amount)throw new ApiError(409,'Payment amount mismatch.');const result=await admin.rpc('credit_verified_funding',{p_user:user.id,p_reference:reference,p_amount:amount,p_payload:verified.data});if(result.error)throw result.error;return NextResponse.json({status:'paid',kind:'funding'})}
 const sub=await admin.from('subscriptions').select('user_id,plan,amount,provider_plan_code,provider_subscription_code,provider_email_token').eq('reference',reference).eq('user_id',user.id).maybeSingle()
 if(sub.error||!sub.data)throw new ApiError(404,'Payment record not found.')
 if(Number(sub.data.amount)!==amount)throw new ApiError(409,'Subscription amount mismatch.')
 const active=await admin.rpc('activate_subscription',{p_user:user.id,p_plan:sub.data.plan,p_reference:reference,p_subscription_code:verified.data.subscription?.subscription_code??sub.data.provider_subscription_code,p_email_token:verified.data.subscription?.email_token??sub.data.provider_email_token,p_period_end:verified.data.subscription?.next_payment_date??null,p_plan_code:sub.data.provider_plan_code});if(active.error)throw active.error
 return NextResponse.json({status:'active',kind:'subscription'})
}catch(error){return apiError(error)}}
