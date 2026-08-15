import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPaystackSignature } from '@/lib/paystack-webhook'

type ProviderData=Record<string,unknown>&{
 reference?:string;amount?:number;status?:string;paid?:boolean;period_end?:string
 transfer_code?:string;gateway_response?:string;invoice_code?:string
 customer?:{email?:string};plan?:{plan_code?:string};
 subscription?:{subscription_code?:string;email_token?:string;next_payment_date?:string}
 subscription_code?:string;email_token?:string;next_payment_date?:string
 failures?:{reason?:string}
}

function text(value:unknown){return typeof value==='string'?value:''}

export async function POST(request:Request){
 const raw=await request.text(),signature=request.headers.get('x-paystack-signature')??'',secret=process.env.PAYSTACK_SECRET_KEY
 if(!secret)return NextResponse.json({error:'Webhook unavailable'},{status:503})
 if(!verifyPaystackSignature(raw,signature,secret))return NextResponse.json({error:'Invalid signature'},{status:401})
 let admin:ReturnType<typeof createAdminClient>|null=null,claimed=false
 try{
  const event=JSON.parse(raw) as {event?:string;data?:ProviderData},eventType=text(event.event),data=event.data??{}
  if(!eventType)throw new Error('Invalid event type')
  admin=createAdminClient()
  const claim=await admin.rpc('claim_provider_webhook_event',{p_signature:signature,p_event_type:eventType,p_reference:text(data.reference)||text(data.invoice_code)||null})
  if(claim.error)throw claim.error
  if(!claim.data)return NextResponse.json({received:true,duplicate:true})
  claimed=true

  if(eventType==='charge.success'){
   const reference=text(data.reference),amount=Number(data.amount)/100
   if(!reference||!Number.isFinite(amount))throw new Error('Invalid charge event')
   const intent=await admin.from('payment_intents').select('user_id,amount').eq('reference',reference).maybeSingle()
   if(intent.error)throw intent.error
   if(intent.data){
    if(Number(intent.data.amount)!==amount)throw new Error('Funding amount mismatch')
    const result=await admin.rpc('credit_verified_funding',{p_user:intent.data.user_id,p_reference:reference,p_amount:amount,p_payload:data});if(result.error)throw result.error
   }else{
    const pending=await admin.from('subscriptions').select('user_id,plan,amount,provider_plan_code,provider_subscription_code,provider_email_token').eq('reference',reference).maybeSingle()
    if(pending.error)throw pending.error
    if(pending.data){
     if(Number(pending.data.amount)!==amount)throw new Error('Subscription amount mismatch')
     const code=text(data.subscription?.subscription_code)||pending.data.provider_subscription_code
     const token=text(data.subscription?.email_token)||pending.data.provider_email_token
     const active=await admin.rpc('activate_subscription',{p_user:pending.data.user_id,p_plan:pending.data.plan,p_reference:reference,p_subscription_code:code||null,p_email_token:token||null,p_period_end:data.subscription?.next_payment_date??null,p_plan_code:pending.data.provider_plan_code});if(active.error)throw active.error
    }
   }
  }else if(['transfer.success','transfer.failed','transfer.reversed'].includes(eventType)){
   const state=eventType.split('.')[1]
   const result=await admin.rpc('finalize_withdrawal',{p_reference:text(data.reference),p_event:state,p_transfer_code:data.transfer_code??null,p_reason:data.failures?.reason??data.gateway_response??null});if(result.error)throw result.error
  }else if(eventType==='subscription.create'){
   const email=text(data.customer?.email).toLowerCase(),planCode=text(data.plan?.plan_code),code=text(data.subscription_code),token=text(data.email_token)
   const profile=await admin.from('profiles').select('id').ilike('email',email).maybeSingle();if(profile.error)throw profile.error
   if(profile.data){
    const update=await admin.from('subscriptions').update({provider_subscription_code:code||null,provider_email_token:token||null,next_payment_at:data.next_payment_date??null,updated_at:new Date().toISOString()}).eq('user_id',profile.data.id).eq('provider_plan_code',planCode).in('status',['pending','active']).select('id').order('created_at',{ascending:false}).limit(1)
    if(update.error)throw update.error
   }
  }else if(eventType==='subscription.disable'){
   const result=await admin.rpc('cancel_subscription_event',{p_subscription_code:text(data.subscription_code),p_immediate:false});if(result.error)throw result.error
  }else if(eventType==='subscription.not_renew'){
   const result=await admin.rpc('cancel_subscription_event',{p_subscription_code:text(data.subscription_code),p_immediate:false});if(result.error)throw result.error
  }else if(eventType==='invoice.payment_failed'){
   const code=text(data.subscription?.subscription_code);if(code){const result=await admin.rpc('mark_subscription_past_due',{p_subscription_code:code});if(result.error)throw result.error}
  }else if(eventType==='invoice.update'&&data.paid===true&&data.subscription?.subscription_code){
   const result=await admin.rpc('renew_subscription',{p_subscription_code:data.subscription.subscription_code,p_reference:text(data.reference)||text(data.invoice_code),p_amount:Number(data.amount)/100,p_period_end:data.subscription.next_payment_date??data.period_end??null});if(result.error)throw result.error
  }

  const completed=await admin.rpc('complete_provider_webhook_event',{p_signature:signature})
  if(completed.error)throw completed.error
  return NextResponse.json({received:true})
 }catch(error){
  if(admin&&claimed)await admin.rpc('fail_provider_webhook_event',{p_signature:signature,p_error:error instanceof Error?error.message:'Webhook failed'})
  return NextResponse.json({error:'Webhook processing failed'},{status:500})
 }
}
