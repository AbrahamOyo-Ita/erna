'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, Bell, BriefcaseBusiness, Check, ChevronRight, CircleHelp,
  Clipboard, CreditCard, Gift, Home as HomeIcon, LoaderCircle, LogOut,
  Megaphone, Menu, Plus, Search, Settings, ShieldCheck, ShoppingBag,
  Sparkles, UserRound, WalletCards, X,
} from 'lucide-react'
import ernaLogo from '../../Erna-Logo.png'
import { pricing } from '@/lib/server/validation'
import { FileUpload } from '@/components/ui/file-upload'
import { CustomSelect } from '@/components/ui/select'
import { trackConversion } from '@/lib/analytics'
import { AdSlot } from './ad-slot'

type Row = {
  id?: string; error?: string; authorizationUrl?: string; code?: string; name?: string; full_name?: string; email?: string | null
  referral_code?: string; plan?: string; plan_expires_at?: string | null; first_paid_withdrawal_at?: string | null; is_admin?: boolean; kyc_tier?: number; phone?: string | null; whatsapp_opted_in_at?: string | null; notification_preferences?: Record<string, boolean>
  available_balance?: number; escrow_balance?: number; task_earnings?: number; referral_earnings?: number; daily_question_earnings?: number
  platform?: string; task_type?: string; worker_payout?: number; advertiser_price?: number; approved_count?: number; reserved_count?: number; quantity?: number; instructions?: string; target_url?: string; advertiser_id?: string
  listing_images?: Row[]; storage_path?: string; sort_order?: number; category?: string; city?: string; state?: string; title?: string; description?: string; price?: number; whatsapp_phone?: string; seller_id?: string
  eligible?: boolean; answered?: boolean; options?: string[]; question?: string; correct?: boolean; explanation?: string
  tasks?: Row; task_submissions?: Row[]; worker_id?: string; status?: string; appealed_at?: string | null; rejection_reason?: string | null; rejection_note?: string | null; submitted_at?: string
  amount?: number; direction?: string; requested_at?: string; account_number_last4?: string; read_at?: string | null; body?: string; escrow_remaining?: number
  risk_reasons?: string[]; action?: string; entity_type?: string; created_at?: string; account_name?: string; flagged?: boolean; sla_due_at?: string
}

type Mutation = (url: string, init: RequestInit, success: string, refresh?: boolean) => Promise<Row>
type AdConfig = { tier: string; client: string; taskSlot: string; walletSlot: string; marketplaceSlot: string } | null
type Props = {
  user: { id: string; email: string; name: string }; profile: Row | null; wallet: Row | null
  tasks: Row[]; submissions: Row[]; campaigns: Row[]; listings: Row[]; notifications: Row[]
  question: Row | null; transactions: Row[]; withdrawals: Row[]; subscription: Row | null
  referralStats: { signups: number; conversions: number }; adConfig: AdConfig
}

const money = (value: unknown) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value) || 0)
const label = (value: unknown) => String(value ?? '').replaceAll('_', ' ')

export function ErnaApp(props: Props) {
  const router = useRouter()
  const [section, setSection] = useState('home')
  const [menu, setMenu] = useState(false)
  const [platform, setPlatform] = useState('all')
  const [activeTask, setActiveTask] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const shown = platform === 'all' ? props.tasks : props.tasks.filter(task => task.platform === platform)
  const nav = [
    ['home', 'Home', HomeIcon], ['wallet', 'Wallet', WalletCards], ['marketplace', 'Marketplace', ShoppingBag],
    ['daily', 'Daily question', CircleHelp], ['profile', 'Profile', UserRound],
  ] as const

  function select(next: string) { setSection(next); setMenu(false); setNotice(''); setError('') }
  async function mutate(url: string, init: RequestInit, success: string, refresh = true) {
    setBusy(true); setError('')
    try {
      const response = await fetch(url, init)
      const data = await response.json() as Row
      if (!response.ok) throw new Error(data.error ?? 'The request failed.')
      setNotice(success)
      if (url === '/api/tasks' && init.method === 'POST') trackConversion('advertiser_task_funded')
      if (refresh) router.refresh()
      return data
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The request failed.')
      throw cause
    } finally { setBusy(false) }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('reference') ?? params.get('trxref')
    if ((!params.has('payment') && !params.has('subscription')) || !reference) return
    let active = true
    ;(async () => {
      setBusy(true)
      try {
        const response = await fetch('/api/paystack/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) })
        const data = await response.json() as Row
        if (!response.ok) throw new Error(data.error ?? 'Payment reconciliation failed.')
        if (active) setNotice(data.status === 'paid' ? 'Wallet funding confirmed.' : 'Subscription confirmed.')
        window.history.replaceState({}, '', window.location.pathname)
        router.refresh()
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Payment reconciliation failed.') }
      finally { if (active) setBusy(false) }
    })()
    return () => { active = false }
  }, [router])

  useEffect(() => {
    const withdrawalKey = `erna:first-paid-withdrawal:${props.user.id}`
    if (props.withdrawals.some(item => item.status === 'paid') && !localStorage.getItem(withdrawalKey)) {
      localStorage.setItem(withdrawalKey, 'tracked')
      trackConversion('first_withdrawal')
      router.push('/thank-you?event=withdrawal')
      return
    }
    const taskKey = `erna:first-approved-task:${props.user.id}`
    if (props.submissions.some(item => item.status === 'approved') && !localStorage.getItem(taskKey)) {
      localStorage.setItem(taskKey, 'tracked')
      trackConversion('first_task_completion')
      router.push('/thank-you?event=first-task')
    }
  }, [props.submissions, props.user.id, props.withdrawals, router])

  return <div className="product-app">
    <aside className={`app-sidebar ${menu ? 'is-open' : ''}`}>
      <div className="app-brand"><Image src={ernaLogo} alt="Erna" priority /><button onClick={() => setMenu(false)} aria-label="Close menu"><X /></button></div>
      <nav aria-label="App navigation">
        {nav.map(([id, text, Icon]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => select(id)}><Icon /><span>{text}</span>{id === 'daily' && !props.question?.answered && <i />}</button>)}
        <button className={section === 'tasks' ? 'active' : ''} onClick={() => select('tasks')}><BriefcaseBusiness /><span>My tasks</span></button>
        <button className={section === 'campaigns' ? 'active' : ''} onClick={() => select('campaigns')}><Megaphone /><span>My campaigns</span></button>
        <button className={section === 'referrals' ? 'active' : ''} onClick={() => select('referrals')}><Gift /><span>Referrals</span></button>
      </nav>
      <div className="app-sidebar-actions"><button onClick={() => select('post')}><Plus />Post a task</button>{props.profile?.is_admin && <Link href="/admin"><ShieldCheck />Admin console</Link>}<form action="/auth/signout" method="post"><button><LogOut />Log out</button></form></div>
    </aside>
    <main className="app-main">
      <header className="app-topbar"><button className="app-menu" onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button><div className="app-greeting"><small>Good day,</small><strong>{props.user.name.split(' ')[0]}</strong></div><div className="app-top-actions"><button className="balance-pill" onClick={() => select('wallet')}><WalletCards /><span><small>Available balance</small><b>{money(props.wallet?.available_balance)}</b></span></button><button className="icon-button" aria-label="Notifications" onClick={() => select('notifications')}><Bell />{props.notifications.some(item => !item.read_at) && <i />}</button></div></header>
      <div className="app-content">
        {notice && <div className="action-notice" role="status"><Check />{notice}</div>}
        {error && <div className="action-notice error" role="alert"><AlertCircle />{error}</div>}
        {section === 'home' && <Home tasks={shown} platform={platform} setPlatform={setPlatform} select={select} balance={props.wallet?.available_balance ?? 0} openTask={setActiveTask} ad={props.adConfig?.tier === 'free' ? props.adConfig : null} />}
        {section === 'wallet' && <Wallet wallet={props.wallet} transactions={props.transactions} withdrawals={props.withdrawals} busy={busy} mutate={mutate} ad={props.adConfig} />}
        {section === 'marketplace' && <Marketplace listings={props.listings} userId={props.user.id} busy={busy} mutate={mutate} ad={props.adConfig} />}
        {section === 'daily' && <Daily question={props.question} busy={busy} mutate={mutate} />}
        {section === 'profile' && <Profile props={props} select={select} busy={busy} mutate={mutate} />}
        {section === 'tasks' && <MyTasks submissions={props.submissions} busy={busy} mutate={mutate} />}
        {section === 'campaigns' && <Campaigns campaigns={props.campaigns} busy={busy} mutate={mutate} />}
        {section === 'referrals' && <Referrals profile={props.profile} stats={props.referralStats} />}
        {section === 'notifications' && <Notifications data={props.notifications} busy={busy} mutate={mutate} />}
        {section === 'post' && <PostTask busy={busy} mutate={mutate} select={select} />}
      </div>
    </main>
    <nav className="app-bottom" aria-label="Mobile navigation">{nav.map(([id, text, Icon]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => select(id)}><Icon /><span>{text}</span>{id === 'daily' && !props.question?.answered && <i />}</button>)}</nav>
    {activeTask && <TaskModal task={activeTask} busy={busy} close={() => setActiveTask(null)} submit={async form => { await mutate(`/api/tasks/${activeTask.id}/submit`, { method: 'POST', body: form }, 'Proof submitted for review.'); setActiveTask(null); select('tasks') }} />}
  </div>
}

function Head({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) { return <div className="view-head"><div><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div> }

function Home({ tasks, platform, setPlatform, select, balance, openTask, ad }: { tasks: Row[]; platform: string; setPlatform: (value: string) => void; select: (value: string) => void; balance: number; openTask: (task: Row) => void; ad: AdConfig }) {
  return <><section className="welcome-panel"><div><span className="panel-kicker"><Sparkles />No activation fee. Ever.</span><h1>Earn from small tasks.<br /><em>Build real momentum.</em></h1><p>Complete verified social tasks, submit proof and track every naira transparently.</p><button onClick={() => document.getElementById('task-feed')?.scrollIntoView({ behavior: 'smooth' })}>Find a task <ChevronRight /></button></div><div className="welcome-stat"><small>Your available balance</small><strong>{money(balance)}</strong><span>Withdrawals tracked from request to payment</span></div></section><section id="task-feed" className="view-section"><Head eyebrow="Task feed" title="Available work" copy="Highest-paying tasks appear first. Plus and Pro members see priority tasks earlier." action={<button className="outline-action" onClick={() => select('post')}><Plus />Post a task</button>} /><div className="filter-row">{['all', 'facebook', 'instagram', 'tiktok', 'x', 'linkedin', 'youtube', 'play_store', 'app_store', 'marketplace'].map(value => <button className={platform === value ? 'active' : ''} onClick={() => setPlatform(value)} key={value}>{value === 'all' ? 'All platforms' : label(value)}</button>)}</div><div className="task-grid">{tasks.length ? tasks.map(task => <TaskCard key={task.id} task={task} open={() => openTask(task)} />) : <Empty icon={<Search />} title="No matching tasks" copy="Try another platform filter or check back soon." />}</div></section>{ad && <AdSlot client={ad.client} slot={ad.taskSlot} label="Task feed advertisement" />}</>
}

function TaskCard({ task, open }: { task: Row; open: () => void }) { const approved = task.approved_count ?? 0, reserved = task.reserved_count ?? 0, quantity = task.quantity ?? 1; return <article className="task-card"><div className="task-card-top"><span className={`platform-dot ${task.platform}`}>{String(task.platform).slice(0, 1).toUpperCase()}</span><div><small>{label(task.platform)}</small><strong>{label(task.task_type)}</strong></div><b>{money(task.worker_payout)}</b></div><p>{task.instructions}</p><div className="task-progress"><span><i style={{ width: `${Math.min(100, (approved / quantity) * 100)}%` }} /></span><small>{Math.max(0, quantity - approved - reserved)} spots left</small></div><button onClick={open}>View task <ChevronRight /></button></article> }

function TaskModal({ task, busy, close, submit }: { task: Row; busy: boolean; close: () => void; submit: (form: FormData) => Promise<void> }) { const [file, setFile] = useState<File | null>(null); return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close() }}><section className="app-modal" role="dialog" aria-modal="true" aria-labelledby="task-title"><button className="modal-close" onClick={close} aria-label="Close"><X /></button><span>{label(task.platform)} / {label(task.task_type)}</span><h2 id="task-title">Earn {money(task.worker_payout)}</h2><p>{task.instructions}</p><a href={task.target_url} target="_blank" rel="noopener noreferrer">Open target safely <ChevronRight /></a><FileUpload name="proof" ariaLabel="Upload task proof screenshot" title="Drop your proof screenshot here" description="or choose one image from your device" helperText="JPEG, PNG or WebP, up to 5 MB. Erna strips metadata before private storage." maxFiles={1} maxSizeMb={5} required disabled={busy} onFilesChange={files => setFile(files[0] ?? null)} /><button className="builder-submit" disabled={!file || busy} onClick={() => { if (file) { const form = new FormData(); form.set('proof', file); submit(form) } }}>{busy ? <LoaderCircle className="spin" /> : 'Submit proof'}</button></section></div> }

function Wallet({ wallet, transactions, withdrawals, busy, mutate, ad }: { wallet: Row | null; transactions: Row[]; withdrawals: Row[]; busy: boolean; mutate: Mutation; ad: AdConfig }) {
  const [mode, setMode] = useState<'none' | 'fund' | 'withdraw'>('none'), [banks, setBanks] = useState<Row[]>([]), [bankError, setBankError] = useState('')
  async function openWithdraw() { setMode('withdraw'); setBankError(''); if (!banks.length) { try { const response = await fetch('/api/paystack/banks'), data = await response.json() as { banks?: Row[]; error?: string }; if (!response.ok) throw new Error(data.error ?? 'Banks could not be loaded.'); setBanks(data.banks ?? []) } catch (cause) { setBankError(cause instanceof Error ? cause.message : 'Banks could not be loaded.') } } }
  return <><Head eyebrow="Your wallet" title="Every naira, accounted for." copy="Funding is webhook-verified. Withdrawals remain reserved while they move through review and bank transfer." /><section className="wallet-hero"><div><small>Available balance</small><strong>{money(wallet?.available_balance)}</strong><span>Escrow committed: {money(wallet?.escrow_balance)}</span></div><div className="wallet-buttons"><button onClick={() => setMode('fund')}><CreditCard />Fund wallet</button><button className="light" onClick={openWithdraw}>Withdraw</button></div></section>{mode === 'fund' && <FundForm busy={busy} submit={async amount => { const data = await mutate('/api/paystack/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) }, 'Opening secure Paystack checkout...', false); if (!data.authorizationUrl) throw new Error('Paystack checkout URL was not returned.'); location.assign(data.authorizationUrl) }} />}{mode === 'withdraw' && <><WithdrawForm banks={banks} busy={busy || !banks.length} submit={async body => { await mutate('/api/withdrawals/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 'Withdrawal requested. Track its status below.'); setMode('none') }} />{bankError && <p className="form-status error" role="alert">{bankError}</p>}</>}<div className="earning-grid">{[['Task earnings', wallet?.task_earnings], ['Referral earnings', wallet?.referral_earnings], ['Daily question', wallet?.daily_question_earnings]].map(([text, amount]) => <article key={String(text)}><span>{text}</span><strong>{money(amount)}</strong></article>)}</div>{ad && <AdSlot client={ad.client} slot={ad.walletSlot} label="Wallet advertisement" />}<section className="data-panel"><div className="data-panel-head"><h2>Withdrawal status</h2></div>{withdrawals.length ? withdrawals.map(item => <div className="submission-wrap" key={item.id}><div className="data-row"><span>{new Date(String(item.requested_at)).toLocaleDateString('en-NG')} / account ending {item.account_number_last4}</span><b>{money(item.amount)}</b><i className={item.status}>{item.status}</i></div>{item.sla_due_at && !['paid', 'failed', 'reversed'].includes(String(item.status)) && <p className="row-note">Expected by {new Date(item.sla_due_at).toLocaleString('en-NG')}</p>}</div>) : <Empty icon={<WalletCards />} title="No withdrawals yet" copy="Your first minimum is ₦1,000. Subsequent Free-plan withdrawals use ₦3,000." />}</section><section className="data-panel"><div className="data-panel-head"><h2>Transaction history</h2></div>{transactions.length ? transactions.map(item => <div className="data-row" key={item.id}><span>{item.description ?? label(item.category)}</span><b>{item.direction === 'debit' ? '-' : '+'}{money(item.amount)}</b><i className={item.status}>{item.status}</i></div>) : <Empty icon={<WalletCards />} title="No transactions yet" copy="Funding, earnings and withdrawals will appear here." />}</section></>
}

function FundForm({ busy, submit }: { busy: boolean; submit: (amount: number) => Promise<void> }) { const [amount, setAmount] = useState(1000); return <form className="inline-form" onSubmit={event => { event.preventDefault(); submit(amount) }}><label>Amount (₦)<input type="number" min="100" max="5000000" value={amount} onChange={event => setAmount(Number(event.target.value))} /></label><button disabled={busy}>{busy ? <LoaderCircle className="spin" /> : 'Continue to Paystack'}</button></form> }
function WithdrawForm({ banks, busy, submit }: { banks: Row[]; busy: boolean; submit: (body: { amount: number; bankCode: string; accountNumber: string }) => Promise<void> }) { const [amount, setAmount] = useState(1000), [bankCode, setBankCode] = useState(''), [accountNumber, setAccountNumber] = useState(''); return <form className="inline-form withdrawal-form" onSubmit={event => { event.preventDefault(); submit({ amount, bankCode, accountNumber }) }}><label>Amount (₦)<input type="number" min="1000" value={amount} onChange={event => setAmount(Number(event.target.value))} /></label><div className="field-block"><span className="field-label">Bank</span><CustomSelect required ariaLabel="Bank" placeholder="Choose bank" value={bankCode} onValueChange={setBankCode} options={banks.map(bank => ({ value: String(bank.code ?? ''), label: String(bank.name ?? '') }))} /></div><label>Account number<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={accountNumber} onChange={event => setAccountNumber(event.target.value.replace(/\D/g, ''))} /></label><button disabled={busy}>{busy ? <LoaderCircle className="spin" /> : 'Request withdrawal'}</button><small>We resolve the account name with Paystack before reserving funds. Every request receives manual review.</small></form> }

function Marketplace({ listings, userId, busy, mutate, ad }: { listings: Row[]; userId: string; busy: boolean; mutate: Mutation; ad: AdConfig }) {
  const [creating, setCreating] = useState(false), [query, setQuery] = useState(''), [locationFilter, setLocationFilter] = useState('all'), [boosting, setBoosting] = useState<string | null>(null)
  const locations = useMemo(() => [...new Set(listings.map(item => `${item.city}, ${item.state}`).filter(value => value !== 'undefined, undefined'))], [listings])
  const filtered = listings.filter(item => { const searchable = `${item.title} ${item.description} ${item.category} ${item.city} ${item.state}`.toLowerCase(); return searchable.includes(query.toLowerCase()) && (locationFilter === 'all' || `${item.city}, ${item.state}` === locationFilter) })
  return <><Head eyebrow="Marketplace" title="Buy and sell across Nigeria." copy="Search permissioned listings and contact sellers directly on WhatsApp." action={<button className="outline-action" onClick={() => setCreating(value => !value)}><Plus />{creating ? 'Close form' : 'Create listing'}</button>} />{creating && <ListingForm busy={busy} submit={async form => { await mutate('/api/listings', { method: 'POST', body: form }, 'Listing published.'); setCreating(false) }} />}<div className="search-bar"><Search /><input aria-label="Search listings" placeholder="Search products or services" value={query} onChange={event => setQuery(event.target.value)} /><CustomSelect ariaLabel="Filter marketplace by location" value={locationFilter} onValueChange={setLocationFilter} options={[{ value: 'all', label: 'All locations' }, ...locations.map(location => ({ value: location, label: location }))]} /></div>{filtered.length ? <div className="listing-grid">{filtered.map(item => { const path = [...(item.listing_images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.storage_path, src = path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}` : null; return <article key={item.id}>{src ? <div className="listing-image real"><Image src={src} alt={`${item.title}, a marketplace listing in ${item.city}`} width={640} height={480} sizes="(max-width: 760px) 100vw, 33vw" /></div> : <div className="listing-image"><ShoppingBag /></div>}<small>{item.category} / {item.city}</small><h3>{item.title}</h3><strong>{money(item.price)}</strong><a href={`https://wa.me/${item.whatsapp_phone}?text=${encodeURIComponent(`Hello, I saw ${item.title} on Erna.`)}`} target="_blank" rel="noreferrer">Contact seller</a>{item.seller_id === userId && <button className="listing-boost" onClick={() => setBoosting(boosting === item.id ? null : String(item.id))}>Boost listing</button>}{boosting === item.id && <BoostForm busy={busy} submit={quantity => mutate(`/api/listings/${item.id}/boost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity }) }, 'Listing boost funded and published.').then(() => setBoosting(null))} />}</article> })}</div> : <Empty icon={<ShoppingBag />} title="No matching listings" copy="Adjust the search or publish the first listing in this location." />}{ad && <AdSlot client={ad.client} slot={ad.marketplaceSlot} label="Marketplace advertisement" />}</>
}

function ListingForm({ busy, submit }: { busy: boolean; submit: (form: FormData) => Promise<void> }) { return <form className="builder listing-builder" onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget)) }}><label>Title<input name="title" minLength={3} maxLength={120} required /></label><label>Category<input name="category" minLength={2} maxLength={80} required /></label><label>Price (₦)<input name="price" type="number" min="0" step="0.01" required /></label><label>WhatsApp number<input name="whatsapp" type="tel" placeholder="0801 234 5678" required /></label><label>State<input name="state" defaultValue="Cross River" required /></label><label>City<input name="city" defaultValue="Calabar" required /></label><label className="full">Description<textarea name="description" minLength={10} maxLength={4000} required /></label><FileUpload className="full" name="images" ariaLabel="Upload listing images" title="Add clear listing photos" description="Drop 1 to 6 images here, or browse your device" helperText="JPEG, PNG or WebP, up to 8 MB each. Erna sanitizes every image before publishing." multiple maxFiles={6} maxSizeMb={8} required disabled={busy} /><button className="builder-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : 'Publish listing'}</button></form> }
function BoostForm({ busy, submit }: { busy: boolean; submit: (quantity: number) => Promise<unknown> }) { const [quantity, setQuantity] = useState(50); return <form className="appeal-form" onSubmit={event => { event.preventDefault(); submit(quantity) }}><label>Engagement quantity<input type="number" min="10" max="10000" value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></label><small>Total escrow: {money(quantity * pricing['marketplace:engage'].advertiser)}</small><button disabled={busy}>Fund boost</button></form> }

function Daily({ question, busy, mutate }: { question: Row | null; busy: boolean; mutate: Mutation }) { const [picked, setPicked] = useState<number | null>(null), [result, setResult] = useState<Row | null>(null); if (!question) return <><Head eyebrow="Daily question" title="Today's question is not available." copy="An administrator needs to publish today's reviewed question." /><Empty icon={<CircleHelp />} title="Check back later" copy="Daily questions are curated before publication." /></>; return <><Head eyebrow="Daily question" title="One answer. A ₦20 reward." copy="Complete at least one approved task today to unlock it. Rewards are server-verified and issued once." /><section className="question-card"><div className="question-meta"><span className={question.eligible ? '' : 'locked'}><Check />{question.eligible ? 'Task gate passed' : 'Complete an approved task first'}</span><b>₦20</b></div><h2>{question.question}</h2><div className="answer-grid">{(question.options ?? []).map((option, index) => <button disabled={!question.eligible || question.answered || !!result} className={picked === index ? 'selected' : ''} onClick={() => setPicked(index)} key={option}><i>{String.fromCharCode(65 + index)}</i>{option}</button>)}</div>{question.answered ? <p className="answer-result">You already answered today&apos;s question.</p> : result ? <p className="answer-result">{result.correct ? 'Correct. ₦20 was credited.' : 'Not quite.'} {result.explanation}</p> : <button className="question-submit" disabled={!question.eligible || picked === null || busy} onClick={async () => { const data = await mutate('/api/trivia/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: question.id, selectedIndex: picked }) }, 'Daily answer recorded.'); setResult(data) }}>{busy ? <LoaderCircle className="spin" /> : 'Submit answer'}</button>}</section></> }

function MyTasks({ submissions, busy, mutate }: { submissions: Row[]; busy: boolean; mutate: Mutation }) { const [appeal, setAppeal] = useState<string | null>(null), [reason, setReason] = useState(''); return <><Head eyebrow="My work" title="Submission history" copy="Pending, approved, rejected and appealed proof in one place." /><section className="data-panel">{submissions.length ? submissions.map(item => <div className="submission-wrap" key={item.id}><div className="data-row"><span>{label(item.tasks?.platform)} / {label(item.tasks?.task_type)}</span><b>{money(item.tasks?.worker_payout)}</b><i className={item.status}>{item.status}</i>{item.status === 'rejected' && !item.appealed_at && <button onClick={() => setAppeal(String(item.id))}>Appeal</button>}</div>{item.status === 'rejected' && <p className="row-note">Reason: {label(item.rejection_reason)} {item.rejection_note}</p>}{appeal === item.id && <form className="appeal-form" onSubmit={async event => { event.preventDefault(); await mutate(`/api/submissions/${item.id}/appeal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }, 'Appeal sent for admin review.'); setAppeal(null) }}><textarea minLength={10} maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why the decision should be reviewed." /><button disabled={busy}>Submit appeal</button></form>}</div>) : <Empty icon={<BriefcaseBusiness />} title="No submissions yet" copy="Choose a task from the feed and submit your first proof." />}</section></> }

function Campaigns({ campaigns, busy, mutate }: { campaigns: Row[]; busy: boolean; mutate: Mutation }) { const [rejecting, setRejecting] = useState<string | null>(null), [reason, setReason] = useState(''); const pending = campaigns.flatMap(task => (task.task_submissions ?? []).filter(item => item.status === 'pending').map(item => ({ ...item, task }))); return <><Head eyebrow="Advertiser review" title="Campaigns and submissions" copy="Approve valid proof or reject it with a clear reason. Every decision is enforced server-side." /><section className="data-panel">{campaigns.length ? campaigns.map(task => <div className="submission-wrap" key={task.id}><div className="data-row"><span>{label(task.platform)} / {label(task.task_type)}</span><b>{task.approved_count ?? 0}/{task.quantity ?? 0} approved</b><i className={task.status}>{task.status}</i></div><p className="row-note">Escrow remaining: {money(task.escrow_remaining)}. Pending review: {(task.task_submissions ?? []).filter(item => item.status === 'pending').length}</p></div>) : <Empty icon={<Megaphone />} title="No campaigns yet" copy="Post and fund a task to begin collecting submissions." />}</section><section className="data-panel"><div className="data-panel-head"><h2>Pending proof review</h2></div>{pending.length ? pending.map(item => <div className="submission-wrap" key={item.id}><div className="data-row"><span>{label(item.task.platform)} / {label(item.task.task_type)}</span><a href={`/api/submissions/${item.id}/proof`} target="_blank" rel="noreferrer">View proof</a><button disabled={busy} onClick={() => mutate(`/api/submissions/${item.id}/review`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'approved' }) }, 'Submission approved and worker credited.')}>Approve</button><button disabled={busy} onClick={() => setRejecting(String(item.id))}>Reject</button></div>{rejecting === item.id && <form className="appeal-form" onSubmit={async event => { event.preventDefault(); await mutate(`/api/submissions/${item.id}/review`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'rejected', reason: 'other', note: reason }) }, 'Submission rejected with a recorded reason.'); setRejecting(null); setReason('') }}><textarea minLength={5} maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why the proof is invalid." /><button disabled={busy}>Confirm rejection</button></form>}</div>) : <Empty icon={<Check />} title="No proof is waiting" copy="New submissions will appear here for review." />}</section></> }

function Referrals({ profile, stats }: { profile: Row | null; stats: Props['referralStats'] }) { const code = profile?.referral_code ?? ''; return <><Head eyebrow="Referrals" title="Invite one. Earn once." copy="Earn ₦300 when your referral completes their first approved task. Pro members earn ₦400." /><section className="referral-card"><Gift /><span>Your referral code</span><strong>{code}</strong><button onClick={() => navigator.clipboard.writeText(code)}><Clipboard />Copy code</button></section><div className="earning-grid"><article><span>Signups</span><strong>{stats.signups}</strong></article><article><span>Conversions</span><strong>{stats.conversions}</strong></article><article><span>Total reward value</span><strong>{money(stats.conversions * (profile?.plan === 'pro' ? 400 : 300))}</strong></article></div></> }

function Notifications({ data, busy, mutate }: { data: Row[]; busy: boolean; mutate: Mutation }) { return <><Head eyebrow="Updates" title="Notifications" copy="Approval, payment, referral and marketplace updates live here." action={data.some(item => !item.read_at) ? <button className="outline-action" disabled={busy} onClick={() => mutate('/api/notifications/read', { method: 'POST' }, 'Notifications marked as read.')}>Mark all read</button> : undefined} /><section className="data-panel">{data.length ? data.map(item => <div className="notification-row" key={item.id}><span><Bell /></span><div><strong>{item.title}</strong><p>{item.body}</p></div>{!item.read_at && <i />}</div>) : <Empty icon={<Bell />} title="You are all caught up" copy="Important account updates will appear here." />}</section></> }

function Profile({ props, select, busy, mutate }: { props: Props; select: (value: string) => void; busy: boolean; mutate: Mutation }) {
  const eligible = !!props.profile?.first_paid_withdrawal_at
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(props.user.name)
  const [phone, setPhone] = useState(props.profile?.phone ?? '')
  const [whatsappOptIn, setWhatsappOptIn] = useState(props.profile?.notification_preferences?.whatsapp === true && !!props.profile?.whatsapp_opted_in_at)

  return <>
    <Head eyebrow="Account" title="Profile and plans" copy="Manage identity, verification, notifications and plan benefits." />
    <section className="profile-card"><div className="avatar">{props.user.name.slice(0, 1)}</div><div><h2>{props.user.name}</h2><p>{props.user.email}</p><span>{props.profile?.plan ?? 'free'} plan</span></div><button onClick={() => setEditing(value => !value)}><Settings />{editing ? 'Close editor' : 'Edit profile'}</button></section>
    {editing && <form className="inline-form profile-editor" onSubmit={async event => {
      event.preventDefault()
      await mutate('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, whatsappPhone: phone, whatsappOptIn }),
      }, 'Profile updated.')
      setEditing(false)
    }}>
      <label>Full name<input value={fullName} minLength={2} maxLength={120} onChange={event => setFullName(event.target.value)} required /></label>
      <label>Phone number<input value={phone} onChange={event => setPhone(event.target.value)} placeholder="0801 234 5678" required={whatsappOptIn} /></label>
      <label className="whatsapp-optin"><input type="checkbox" checked={whatsappOptIn} onChange={event => setWhatsappOptIn(event.target.checked)} /><span><strong>WhatsApp product alerts</strong><small>Opt in to approvals, rejections, a daily new-task alert, review reminders and daily question nudges. Payment, withdrawal and OTP messages are never sent through this unofficial channel.</small></span></label>
      <button disabled={busy}>Save profile</button>
    </form>}
    <div className="settings-list"><div><ShieldCheck /><span><strong>Identity verification</strong><small>KYC tier {props.profile?.kyc_tier ?? 0}. Contact support when higher verification is required.</small></span></div><button onClick={() => select('referrals')}><Gift /><span><strong>Referral dashboard</strong><small>Invite and track conversions</small></span><ChevronRight /></button><button onClick={() => select('notifications')}><Bell /><span><strong>Notifications</strong><small>Review in-app, email and opted-in WhatsApp alerts</small></span><ChevronRight /></button></div>
    <section className="plans"><Head eyebrow="Optional plans" title="Upgrade after trust is earned." copy={eligible ? 'Your successful withdrawal unlocks optional upgrades.' : 'Plans unlock only after your first successful withdrawal.'} /><div className="plan-grid">{[['Free', 0, 'Full ads / 24-48 hour withdrawal SLA'], ['Plus', 500, 'Fewer ads / priority tasks / 36 hour SLA'], ['Pro', 1000, 'No ads / 12-24 hour SLA / ₦400 referrals']].map(([name, price, copy]) => <article key={String(name)}><span>{name}</span><strong>{money(price)}<small>/month</small></strong><p>{copy}</p>{name !== 'Free' && <button disabled={!eligible || busy || props.profile?.plan === String(name).toLowerCase()} onClick={async () => { const data = await mutate('/api/subscriptions/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: String(name).toLowerCase() }) }, 'Opening secure subscription checkout...', false); if (!data.authorizationUrl) throw new Error('Paystack checkout URL was not returned.'); location.assign(data.authorizationUrl) }}>{props.profile?.plan === String(name).toLowerCase() ? 'Current plan' : eligible ? 'Choose plan' : 'Locked'}</button>}</article>)}</div>{props.subscription?.status === 'active' && <button className="cancel-plan" disabled={busy} onClick={() => mutate('/api/subscriptions/cancel', { method: 'POST' }, 'Subscription will not renew.')}>Cancel renewal</button>}</section>
  </>
}

function PostTask({ busy, mutate, select }: { busy: boolean; mutate: Mutation; select: (value: string) => void }) {
  const [platform, setPlatform] = useState('facebook')
  const [taskType, setTaskType] = useState('follow')
  const [quantity, setQuantity] = useState(100)
  const choices = Object.keys(pricing).filter(key => key.startsWith(`${platform}:`)).map(key => key.split(':')[1])
  const unit = pricing[`${platform}:${taskType}`]?.advertiser ?? 0
  const total = unit * quantity
  const platforms = [...new Set(Object.keys(pricing).map(key => key.split(':')[0]))]

  function changePlatform(value: string) {
    setPlatform(value)
    setTaskType(Object.keys(pricing).find(key => key.startsWith(`${value}:`))?.split(':')[1] ?? 'like')
  }

  return <>
    <Head eyebrow="Advertiser tools" title="Post a funded task" copy="A task becomes public only after wallet escrow is committed atomically." />
    <form className="builder" onSubmit={async event => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      await mutate('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, taskType, targetUrl: form.get('targetUrl'), instructions: form.get('instructions'), quantity, reviewMode: form.get('reviewMode') }),
      }, 'Task funded and published.')
      select('campaigns')
    }}>
      <div className="field-block"><span className="field-label">Platform</span><CustomSelect ariaLabel="Task platform" value={platform} onValueChange={changePlatform} options={platforms.map(value => ({ value, label: label(value) }))} /></div>
      <div className="field-block"><span className="field-label">Task type</span><CustomSelect ariaLabel="Task type" value={taskType} onValueChange={setTaskType} options={choices.map(value => ({ value, label: label(value) }))} /></div>
      <label className="full">Target URL<input name="targetUrl" required type="url" placeholder="https://..." /></label>
      <label>Quantity<input value={quantity} min="1" max="100000" type="number" onChange={event => setQuantity(Number(event.target.value))} /></label>
      <div className="field-block"><span className="field-label">Review mode</span><CustomSelect name="reviewMode" ariaLabel="Review mode" defaultValue="manual" options={[{ value: 'manual', label: 'Manual review' }, { value: 'auto_spot_check', label: 'Auto approve with 10% sampling' }]} /></div>
      <label className="full">Instructions<textarea name="instructions" required minLength={10} maxLength={3000} placeholder="Write clear, verifiable instructions" /></label>
      <div className="builder-total"><span>{money(unit)} per completion</span><strong>{money(total)}</strong><small>Total escrow budget. Commission is already included.</small></div>
      <button className="builder-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : 'Fund from wallet and publish'}<ChevronRight /></button>
    </form>
  </>
}

function Empty({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) { return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{copy}</p></div> }
