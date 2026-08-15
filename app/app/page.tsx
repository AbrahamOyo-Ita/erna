import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErnaApp } from '@/components/app/erna-app'
import { requireUser } from '@/lib/server/request'
import { adExposure, effectivePlan } from '@/lib/server/plans'

export default async function AppPage(){
 const supabase=await createClient();if(!supabase)redirect('/login?error=Supabase+is+not+configured')
 let user;try{user=await requireUser()}catch{redirect('/login?next=/app&error=Your+session+has+expired')}
 const [profile,wallet,tasks,submissions,campaigns,listings,notifications,transactions,withdrawals,subscription,referrals]=await Promise.all([
  supabase.from('profiles').select('full_name,phone,whatsapp_phone,whatsapp_opted_in_at,notification_preferences,referral_code,plan,plan_expires_at,first_paid_withdrawal_at,is_admin,kyc_tier').eq('id',user.id).single(),
  supabase.from('wallets').select('*').eq('user_id',user.id).single(),
  supabase.from('tasks').select('*').eq('status','active').order('worker_payout',{ascending:false}).limit(30),
  supabase.from('task_submissions').select('*,tasks(platform,task_type,worker_payout,instructions)').eq('worker_id',user.id).order('submitted_at',{ascending:false}).limit(30),
  supabase.from('tasks').select('*,task_submissions(id,status,submitted_at,worker_id,rejection_reason,rejection_note)').eq('advertiser_id',user.id).order('created_at',{ascending:false}).limit(30),
  supabase.from('listings').select('*,listing_images(storage_path,sort_order),seller_ratings(rating)').eq('status','active').order('created_at',{ascending:false}).limit(30),
  supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30),
  supabase.from('wallet_transactions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50),
  supabase.from('withdrawals').select('*').eq('user_id',user.id).order('requested_at',{ascending:false}).limit(20),
  supabase.from('subscriptions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  supabase.from('referrals').select('id,bonus_paid').eq('referrer_id',user.id),
 ])
 let question:null|Record<string,unknown>=null
 try{const admin=createAdminClient();const result=await admin.rpc('get_daily_question_state',{p_user:user.id});question=result.data}catch{/* Server key is listed as a production prerequisite. */}
 const plan=effectivePlan(profile.data),exposure=adExposure(plan)
 if(profile.data)profile.data.plan=plan
 const adConfig=plan==='pro'?null:{tier:plan,client:process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID??'',taskSlot:exposure.taskFeed?process.env.NEXT_PUBLIC_AD_TASK_FEED_SLOT??'':'',walletSlot:exposure.wallet?process.env.NEXT_PUBLIC_AD_WALLET_SLOT??'':'',marketplaceSlot:exposure.marketplace?process.env.NEXT_PUBLIC_AD_MARKETPLACE_SLOT??'':''}
 return <ErnaApp user={{id:user.id,email:user.email??'',name:profile.data?.full_name??'Erna user'}} profile={profile.data} wallet={wallet.data} tasks={tasks.data??[]} submissions={submissions.data??[]} campaigns={campaigns.data??[]} listings={listings.data??[]} notifications={notifications.data??[]} question={question} transactions={transactions.data??[]} withdrawals={withdrawals.data??[]} subscription={subscription.data??null} referralStats={{signups:referrals.data?.length??0,conversions:referrals.data?.filter(r=>r.bonus_paid).length??0}} adConfig={adConfig}/>
}
