import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { useLoad, Loader, LogoMark, Segmented, naira, fmtDate, todayLagos } from '../ui'
import { SShell } from './common'
import { MODULES } from './modules'

const money = (n) => (Number(n) < 0 ? '-' : '') + naira(Math.abs(Number(n) || 0))
const tone = (n) => ({ color: n > 0 ? '#067647' : n < 0 ? '#b42318' : undefined })
const resultLabel = (r) => (r === 'profit' ? 'Profit' : r === 'loss' ? 'Loss' : 'Break-even')
const resultClass = (r) => (r === 'profit' ? 'ok' : r === 'loss' ? 'bad' : 'info')
const daysAgo = (n) => new Date(new Date(`${todayLagos()}T12:00:00Z`).getTime() - n * 86400000).toISOString().slice(0, 10)
const monthsAgo = (n) => {
  const [y, m] = todayLagos().slice(0, 7).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 10)
}
const monthLabel = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function ProfitCard() {
  const navigate = useNavigate()
  const [view, setView] = useState('Daily')
  const sum = useLoad(() => rpc('profit_summary'), [])
  const rows = useLoad(() => (view === 'Daily'
    ? rpc('profit_loss_daily', { p_from: daysAgo(6), p_to: todayLagos() })
    : rpc('profit_loss_monthly', { p_from: monthsAgo(5), p_to: todayLagos() })), [view])
  const list = [...(rows.data || [])].reverse()
  return (
    <div className="card">
      <div className="card-title">Profit / Loss</div>
      <Loader loading={sum.loading} error={sum.error} reload={sum.reload} />
      {sum.data && (
        <div className="pl-two">
          {[["Today's profit", sum.data.today], ['This month', sum.data.this_month]].map(([label, r]) => (
            <div className="pl-box" key={label}>
              <span className="muted">{label}</span>
              <b style={tone(r.net_profit)}>{money(r.net_profit)}</b>
              <span className={`pill ${resultClass(r.result)}`}>{resultLabel(r.result)}</span>
              <small>Revenue {naira(r.total_revenue)} · Costs {naira(Number(r.product_cost) + Number(r.expenses))}</small>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 12 }}><Segmented options={['Daily', 'Monthly']} value={view} onChange={setView} /></div>
      <p className="muted center">{view === 'Daily' ? 'Last 7 days' : 'Last 6 months'}</p>
      <Loader loading={rows.loading} error={rows.error} reload={rows.reload} />
      {rows.data && (
        <div className="pl-wrap">
          <table className="pl-table">
            <thead><tr><th>{view === 'Daily' ? 'Date' : 'Month'}</th><th>Revenue</th><th>Costs</th><th>Profit / Loss</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.from}>
                  <td>{view === 'Daily' ? fmtDate(`${r.from}T12:00:00Z`) : monthLabel(r.from)}</td>
                  <td>{naira(r.total_revenue)}</td>
                  <td>{naira(Number(r.product_cost) + Number(r.expenses))}</td>
                  <td style={tone(r.net_profit)}><b>{money(r.net_profit)}</b><div className="pl-tag">{resultLabel(r.result)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => navigate('/reports')}>Full profit &amp; loss report</button>
    </div>
  )
}

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
      <ProfitCard />
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
