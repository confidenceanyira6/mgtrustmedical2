import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { useLoad, Kv, LogoMark, naira } from '../ui'
import { SShell, useRole, allow, ROLES } from './common'
import { MODULES } from './modules'

const money = (n) => (Number(n) < 0 ? '-' : '') + naira(Math.abs(Number(n) || 0))
const tone = (n) => ({ color: n > 0 ? '#067647' : n < 0 ? '#b42318' : undefined })
const resultLabel = (r) => (r === 'profit' ? 'Profit' : r === 'loss' ? 'Loss' : 'Break-even')
const resultClass = (r) => (r === 'profit' ? 'ok' : r === 'loss' ? 'bad' : 'info')

export function StaffHome() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { role, front, lab, isAdmin } = useRole()
  const dash = useLoad(() => (front || lab ? rpc('lab_dashboard') : Promise.resolve(null)), [role])
  const br = useLoad(() => (isAdmin ? query(supabase.from('branches').select('id').limit(1)) : Promise.resolve(null)), [role])
  const d = dash.data
  const noBranch = isAdmin && br.data && br.data.length === 0
  const stats = d ? [['/appointments', 'Pending confirmations', d.pending_confirmations], ['/appointments', 'Appointments today', d.today_appointments], ['/lab', 'Samples awaiting', d.samples_awaiting_receipt], ['/lab', 'Awaiting review', d.awaiting_review], ['/lab', 'Overdue tests', d.overdue, true], ['/originals', 'Original report requests', d.pending_original_requests]] : []
  return (
    <SShell title="M.G TRUST MEDICAL" back={false} right={<LogoMark size={28} />}>
      <div className="welcome"><h2>Hello, {(profile.full_name || profile.email || '').split(' ')[0]}</h2><p>{ROLES[role] || role}</p></div>
      {noBranch && (
        <div className="banner">
          <b>Set up your first branch</b>
          <span className="muted">1. Register the branch and its location. 2. List the tests it offers and your prices. Patients can then book.</span>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/branches')}>Register a branch</button>
        </div>
      )}
      {stats.length > 0 && (
        <div className="stat-grid">{stats.map(([to, label, n, alert]) => (
          <div key={label} className={`stat ${alert && n > 0 ? 'alert' : ''}`} onClick={() => navigate(to)}><b>{n ?? 0}</b><span>{label}</span></div>
        ))}</div>
      )}
      <div className="card-title" style={{ marginTop: 4 }}>Modules</div>
      <div className="tile-grid">
        {MODULES.filter((m) => allow(role, m.who)).map(({ to, label, Icon }) => (
          <button type="button" key={to} onClick={() => navigate(to)}><span><Icon size={20} /></span>{label}</button>
        ))}
      </div>
    </SShell>
  )
}

function ProfitGlance() {
  const navigate = useNavigate()
  const sum = useLoad(() => rpc('profit_summary'), [])
  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/profit')}>
      <div className="card-title">Profit / Loss</div>
      {sum.loading && <p className="muted">Loading…</p>}
      {sum.error && <p className="muted">Could not load profit. Tap to open the full page.</p>}
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
      <p className="muted center" style={{ marginTop: 8 }}>Tap for daily and monthly profit &amp; loss</p>
    </div>
  )
}

export function More() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { role, isAdmin } = useRole()
  return (
    <SShell title="More" back={false}>
      <div className="card">
        <div className="profile-name">{profile.full_name || profile.email}</div>
        <Kv k="Role" v={ROLES[role] || role} />
        <Kv k="Email" v={profile.email || '—'} />
      </div>
      {isAdmin && <ProfitGlance />}
      <div className="list menu">
        {MODULES.filter((m) => allow(role, m.who)).map(({ to, label, Icon }) => (
          <div className="row" key={to} onClick={() => navigate(to)}><Icon size={18} className="blue" /><div className="row-main"><div className="row-title">{label}</div></div><ChevronRight size={16} className="muted" /></div>
        ))}
        <div className="row" onClick={signOut}><LogOut size={18} className="red" /><div className="row-main"><div className="row-title red">Log out</div></div></div>
      </div>
    </SShell>
  )
}
