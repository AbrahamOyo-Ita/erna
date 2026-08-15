import { createAdminClient } from '@/lib/supabase/admin'

type Outbox={id:string;recipient:string;template:string;payload:Record<string,unknown>;attempts:number}
const escape=(s:unknown)=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]!))
function content(item:Outbox){const p=item.payload;const map:Record<string,[string,string]>={
 welcome:['Welcome to Erna','Your free Erna account is ready. There is no activation fee to start earning.'],
 task_approved:['Your task was approved',`₦${escape(p.payout)} has been credited to your Erna wallet.`],
 task_rejected:['Your task submission needs attention',`Reason: ${escape(p.reason)}. You can appeal once from My Tasks.`],
 withdrawal_paid:['Your withdrawal was paid',`Your ₦${escape(p.amount)} withdrawal has been completed.`],
 withdrawal_failed:['Your withdrawal was returned',`Your ₦${escape(p.amount)} withdrawal could not be completed, so the full amount was returned to your Erna wallet.`],
 subscription_active:['Your Erna plan is active',`Your ${escape(p.plan)} benefits are now active.`],
 new_task_available:[escape(p.title)||'A new Erna task is available',escape(p.body)||'Open your task feed to review it.'],
 task_reminder:[escape(p.title)||'An Erna task needs attention',escape(p.body)||'Open Erna to review the pending action.'],
 daily_question:[escape(p.title)||'Today\'s Erna question is ready',escape(p.body)||'Open Erna to answer today\'s question.'],
 };return map[item.template]??['An update from Erna','Open Erna to review this account update.']}
export async function deliverOutboxItem(item:Outbox){
 const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;if(!key||!from)throw new Error('Resend is not configured')
 const [subject,message]=content(item);const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':item.id},body:JSON.stringify({from,to:[item.recipient],subject,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1 style="color:#116c36">${escape(subject)}</h1><p style="line-height:1.6;color:#455149">${message}</p><p style="font-size:12px;color:#6d7972">Erna never charges an activation fee.</p></div>`}),signal:AbortSignal.timeout(12000)})
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof data.message==='string'?data.message:'Email provider rejected the message');return String(data.id??'')
}
export async function processEmailOutbox(limit=20){
 const admin=createAdminClient();const {data,error}=await admin.rpc('claim_email_outbox',{p_limit:limit});if(error)throw error
 let sent=0,failed=0
 for(const item of (data??[]) as Outbox[]){try{const providerId=await deliverOutboxItem(item);await admin.from('email_outbox').update({status:'sent',provider_id:providerId,sent_at:new Date().toISOString(),last_error:null}).eq('id',item.id).eq('status','sending');sent++}catch(error){const delay=Math.min(3600,60*2**Math.max(0,item.attempts-1));await admin.from('email_outbox').update({status:'failed',last_error:error instanceof Error?error.message:'Email failed',available_at:new Date(Date.now()+delay*1000).toISOString()}).eq('id',item.id).eq('status','sending');failed++}}
 return {sent,failed}
}
