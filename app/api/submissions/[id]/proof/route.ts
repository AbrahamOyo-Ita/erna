import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, ApiError, requireUser } from '@/lib/server/request'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await context.params
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(400, 'Invalid submission.')

    const admin = createAdminClient()
    const [{ data: submission, error }, { data: profile }] = await Promise.all([
      admin.from('task_submissions').select('proof_path,worker_id,tasks(advertiser_id)').eq('id', id).single(),
      admin.from('profiles').select('is_admin').eq('id', user.id).single(),
    ])
    if (error || !submission) throw new ApiError(404, 'Proof not found.')

    const task = Array.isArray(submission.tasks) ? submission.tasks[0] : submission.tasks
    if (submission.worker_id !== user.id && task?.advertiser_id !== user.id && !profile?.is_admin) {
      throw new ApiError(403, 'You are not allowed to view this proof.')
    }

    const signed = await admin.storage.from('task-proofs').createSignedUrl(submission.proof_path, 60)
    if (signed.error) throw signed.error
    return NextResponse.redirect(signed.data.signedUrl)
  } catch (error) {
    return apiError(error)
  }
}
