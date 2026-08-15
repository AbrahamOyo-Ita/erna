import { redirect } from 'next/navigation'
import { AdminConsole } from '@/components/admin/admin-console'
import { requireAdmin } from '@/lib/server/request'

export default async function AdminPage(){
 let context;try{context=await requireAdmin()}catch{redirect('/app')}
 const {user,admin}=context
 const {data:profile}=await admin.from('profiles').select('full_name').eq('id',user.id).single();if(!profile)redirect('/app')
 const [submissions,withdrawals,disputes,profiles,audit]=await Promise.all([
  admin.from('task_submissions').select('id,status,proof_path,rejection_reason,rejection_note,submitted_at,worker_id,tasks(id,platform,task_type,worker_payout,advertiser_name)').in('status',['pending','appealed']).order('submitted_at'),
  admin.from('withdrawals').select('*').in('status',['requested','processing']).order('flagged',{ascending:false}).order('requested_at'),
  admin.from('disputes').select('*,task_submissions(status,worker_id,tasks(platform,task_type))').in('status',['open','under_review']).order('created_at'),
  admin.from('profiles').select('id,full_name,email,kyc_tier,is_suspended,created_at,plan').order('created_at',{ascending:false}).limit(50),
  admin.from('admin_audit_log').select('*').order('created_at',{ascending:false}).limit(30),
 ])
 return <AdminConsole name={profile.full_name} submissions={submissions.data??[]} withdrawals={withdrawals.data??[]} disputes={disputes.data??[]} users={profiles.data??[]} audit={audit.data??[]}/>
}
