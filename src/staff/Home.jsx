import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { useLoad, Kv, LogoMark } from '../ui'
import { SShell, useRole, allow, ROLES } from './common'
import { MODULES } from './modules'

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

export function More() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { role } = useRole()
  return (
    <SShell title="More" back={false}>
      <div className="card">
        <div className="profile-name">{profile.full_name || profile.email}</div>
        <Kv k="Role" v={ROLES[role] || role} />
        <Kv k="Email" v={profile.email || '—'} />
      </div>
      <div className="list menu">
        {MODULES.filter((m) => allow(role, m.who)).map(({ to, label, Icon }) => (
          <div className="row" key={to} onClick={() => navigate(to)}><Icon size={18} className="blue" /><div className="row-main"><div className="row-title">{label}</div></div><ChevronRight size={16} className="muted" /></div>
        ))}
        <div className="row" onClick={signOut}><LogOut size={18} className="red" /><div className="row-main"><div className="row-title red">Log out</div></div></div>
      </div>
    </SShell>
  )
}
