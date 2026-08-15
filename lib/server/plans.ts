export type ErnaPlan = 'free' | 'plus' | 'pro'

export function effectivePlan(
  profile: { plan?: string | null; plan_expires_at?: string | null } | null,
  now = Date.now(),
): ErnaPlan {
  if (profile?.plan !== 'plus' && profile?.plan !== 'pro') return 'free'
  const expiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : null
  return expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= now)
    ? 'free'
    : profile.plan
}

export function adExposure(plan: ErnaPlan) {
  return {
    taskFeed: plan === 'free',
    wallet: plan !== 'pro',
    marketplace: plan !== 'pro',
  }
}
