import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { useLoad, Loader, LogoMark, naira, todayLagos } from '../ui'
import { SShell } from './common'
import { MODULES } from './modules'

export function AdminDashboard() {
  const navigate = useNavigate()
  const { profile, toast } = useAuth()
  const branches = useLoad(() => query(supabase.from('branches').select('id,name,is_active,latitude,branch_services(count)').order('name')))
  const staff = useLoad(() => query(supabase.from('staff_profiles').select('id,full_name,email,role,is_active').order('created_at')))
  const patients = useLoad(async () => {
    const { count, error } = await supabase.from('patients').select('id', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
    return count
  })
  const lab = useLoad(() => rpc('lab_dashboard'))
  const today = useLoad(() => rpc('total_report', { p_from: todayLagos(), p_to: todayLagos() }))

  const b = branches.data || []
  const people = staff.data || []
  const offered = b.reduce((s, x) => s + (x.branch_services?.[0]?.count || 0), 0)
  const pinned = b.filter((x) => x.latitude != null)
  const withTests = b.filter((x) => (x.branch_services?.[0]?.count || 0) > 0)
  const pending = people.filter((s) => !s.is_active)
  const activeStaff = people.filter((s) => s.is_active)
  const ready = branches.data && staff.data

  const steps = [
    { done: b.length > 0, label: 'Register a branch', hint: 'Name, address and phone number', to: '/branches' },
    { done: b.length > 0 && pinned.length === b.length, label: 'Pin each branch on the map', hint: 'Lets patients get directions and find the nearest branch', to: '/branches' },
    { done: withTests.length > 0, label: 'List the tests each branch offers, with prices', hint: 'Patients can only book what a branch has listed', to: '/services' },
    { done: activeStaff.length > 1, label: 'Add your team', hint: 'Staff sign up or you create their logins, then you approve them, set their role and branch', to: '/users' },
  ]
  const done = steps.filter((s) => s.done).length

  const approve = async (id) => {
    try { await query(supabase.from('staff_profiles').update({ is_active: true }).eq('id', id)); toast('Approved. Set their role and branch under User Management.'); staff.reload() } catch (e) { toast(e.message) }
  }
  const stats = [
    ['/branches', 'Active branches', b.filter((x) => x.is_active).length],
    ['/services', 'Tests & services offered', offered],
    ['/patients', 'Registered patients', patients.data ?? '—'],
    ['/users', 'Active staff', activeStaff.length],
    ['/appointments', 'Pending appointments', lab.data?.pending_confirmations ?? '—'],
    ['/reports', "Today's revenue", today.data ? naira(today.data.total_revenue) : '—'],
  ]
  return (
    <SShell title="Admin" back={false} right={<LogoMark size={28} />}>
      <div className="welcome"><h2>Hello, {(profile.full_name || profile.email || '').split(' ')[0]}</h2><p>Administrator</p></div>
      <Loader loading={branches.loading || staff.loading} error={branches.error || staff.error} reload={() => { branches.reload(); staff.reload() }} />
      {ready && (
        <div className="card">
          <div className="card-title">{done === steps.length ? 'Your centre is set up and open for bookings' : `Getting started — ${done} of ${steps.length} done`}</div>
          {steps.map((s) => (
            <div className="step" key={s.label} onClick={() => navigate(s.to)}>
              {s.done ? <CheckCircle2 size={20} className="green" /> : <Circle size={20} className="muted" />}
              <div><div className="row-title">{s.label}</div><div className="row-sub">{s.hint}</div></div>
            </div>
          ))}
        </div>
      )}
      {pending.length > 0 && (
        <div className="card">
          <div className="card-title">Staff waiting for approval ({pending.length})</div>
          {pending.map((p) => (
            <div className="cart-row" key={p.id} style={{ padding: '8px 0' }}>
              <div className="row-main"><div className="row-title">{p.full_name || p.email}</div><div className="row-sub">{p.email}</div></div>
              <button type="button" className="btn-view" onClick={() => approve(p.id)}>Approve</button>
            </div>
          ))}
        </div>
      )}
      <div className="stat-grid">
        {stats.map(([to, label, n]) => (<div className="stat" key={label} onClick={() => navigate(to)}><b>{n}</b><span>{label}</span></div>))}
      </div>
      <div className="card-title" style={{ marginTop: 4 }}>Manage</div>
      <div className="tile-grid">
        {MODULES.map(({ to, label, Icon }) => (
          <button type="button" key={to} onClick={() => navigate(to)}><span><Icon size={20} /></span>{label}</button>
        ))}
      </div>
    </SShell>
  )
}
