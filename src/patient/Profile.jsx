import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, CreditCard, HelpCircle, Info, LogOut, Phone, Mail, MapPin } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { Shell, useLoad, Loader, Kv, Sheet, LogoMark, fmtDT, fmtDate, naira, patientNav } from '../ui'

const CHANNELS = [['in_app', 'In-app'], ['sms', 'SMS'], ['email', 'Email']]

export function Profile() {
  const navigate = useNavigate()
  const { profile, signOut, refreshProfile, toast } = useAuth()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  const edit = () => {
    setF({ full_name: profile.full_name || '', phone: profile.phone || '', address: profile.address || '', sex: profile.sex || '', date_of_birth: profile.date_of_birth || '', channels: profile.notification_channels || ['in_app'] })
    setOpen(true)
  }
  const toggle = (k) => setF((s) => ({ ...s, channels: s.channels.includes(k) ? s.channels.filter((x) => x !== k) : [...s.channels, k] }))
  const save = async () => {
    if (f.full_name.trim().length < 2) return toast('Enter your full name')
    setBusy(true)
    try {
      await rpc('patient_update_profile', { p_full_name: f.full_name.trim(), p_phone: f.phone.trim() || null, p_address: f.address.trim() || null, p_sex: f.sex || null, p_date_of_birth: f.date_of_birth || null, p_notification_channels: f.channels.length ? f.channels : ['in_app'] })
      await refreshProfile(); setOpen(false); toast('Profile updated')
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const rows = [
    { Icon: Bell, label: 'Notifications', to: '/notifications' },
    { Icon: CreditCard, label: 'Bills & Receipts', to: '/bills' },
    { Icon: HelpCircle, label: 'Help & Support', to: '/help' },
    { Icon: Info, label: 'About', to: '/about' },
  ]
  return (
    <Shell title="My Profile" back={false} nav={patientNav}>
      <div className="card">
        <div className="profile"><div className="avatar big">{(profile.full_name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</div>
          <div><div className="profile-name">{profile.full_name}</div><div className="muted">{profile.patient_code}</div></div></div>
        <div className="contact" style={{ marginTop: 12 }}>
          {profile.phone && <div><Phone size={16} />{profile.phone}</div>}
          {profile.email && <div><Mail size={16} />{profile.email}</div>}
          {profile.address && <div><MapPin size={16} />{profile.address}</div>}
        </div>
        <Kv k="Sex" v={profile.sex || '—'} />
        <Kv k="Date of birth" v={profile.date_of_birth ? fmtDate(profile.date_of_birth) : '—'} />
        <button type="button" className="btn btn-outline" style={{ marginTop: 10 }} onClick={edit}>Edit Profile</button>
      </div>
      <div className="list menu">
        {rows.map(({ Icon, label, to }) => (
          <div className="row" key={label} onClick={() => navigate(to)}><Icon size={18} className="blue" /><div className="row-main"><div className="row-title">{label}</div></div><ChevronRight size={16} className="muted" /></div>
        ))}
        <div className="row" onClick={signOut}><LogOut size={18} className="red" /><div className="row-main"><div className="row-title red">Log out</div></div></div>
      </div>
      <Sheet open={open} title="Edit profile" onClose={() => setOpen(false)}>
        <div className="form">
          <label>Full name</label><input className="input" value={f.full_name || ''} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <label>Phone</label><input className="input" type="tel" value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <label>Address</label><input className="input" value={f.address || ''} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <label>Sex</label>
          <select className="input" value={f.sex || ''} onChange={(e) => setF({ ...f, sex: e.target.value })}><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select>
          <label>Date of birth</label><input className="input" type="date" value={f.date_of_birth || ''} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} />
          <label>Notify me by</label>
          <div className="chips">{CHANNELS.map(([k, v]) => <button type="button" key={k} className={(f.channels || []).includes(k) ? 'active' : ''} onClick={() => toggle(k)}>{v}</button>)}</div>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Save changes</button>
        </div>
      </Sheet>
    </Shell>
  )
}

export function Notifications() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('notifications').select('id,title,body,related_type,related_id,read_at,created_at').eq('channel', 'in_app').order('created_at', { ascending: false }).limit(50)))
  const open = async (n) => {
    if (!n.read_at) rpc('mark_notification_read', { p_id: n.id }).catch(() => {})
    const to = { appointment: `/appointments/${n.related_id}`, lab_report: `/results/${n.related_id}`, thread: `/messages/${n.related_id}` }[n.related_type]
    if (to) navigate(to); else reload()
  }
  const readAll = async () => { try { await rpc('mark_all_notifications_read'); reload() } catch { /* ignore */ } }
  return (
    <Shell title="Notifications" nav={patientNav} right={data?.some((n) => !n.read_at) && <button type="button" className="link-btn" onClick={readAll}>Mark all read</button>}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (data.length ? (
        <div className="list">
          {data.map((n) => (
            <div className={`row ${n.read_at ? '' : 'unread'}`} key={n.id} onClick={() => open(n)}>
              <div className="row-main"><div className="row-title">{n.title}</div><div className="row-sub">{n.body}</div><div className="row-sub">{fmtDT(n.created_at)}</div></div>
            </div>
          ))}
        </div>
      ) : <div className="empty">You're all caught up.</div>)}
    </Shell>
  )
}

export function Bills() {
  const { data, loading, error, reload } = useLoad(() => rpc('get_my_bills'))
  return (
    <Shell title="Bills & Receipts" nav={patientNav}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (
        <>
          <div className="card center-card"><div className="muted">Outstanding balance</div><div className="price-big">{naira(data.outstanding)}</div></div>
          {data.bills.length ? (
            <div className="list">
              {data.bills.map((b) => (
                <div className="row" key={b.id}>
                  <div className="row-main"><div className="row-title">{b.bill_code}</div><div className="row-sub">{fmtDate(b.billed_at)}</div></div>
                  <div className="stock-end"><b>{naira(b.total)}</b><span className={`pill ${b.status === 'paid' ? 'ok' : 'warn'}`}>{b.status === 'paid' ? 'Paid' : `Due ${naira(b.balance)}`}</span></div>
                </div>
              ))}
            </div>
          ) : <div className="empty">No bills yet.</div>}
        </>
      )}
    </Shell>
  )
}

export function Help() {
  const { data, loading, error, reload } = useLoad(() => rpc('get_centre_info'))
  const contact = Object.entries(data?.contact || {}).filter(([, v]) => typeof v === 'string' && v)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return (
    <Shell title="Help & Support" nav={patientNav}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (
        <>
          <div className="card"><div className="card-title">Contact the centre</div>{contact.length ? contact.map(([k, v]) => <Kv key={k} k={k.replace(/_/g, ' ')} v={v} />) : <p className="muted">Use Messages to reach us.</p>}</div>
          <div className="card"><div className="card-title">Opening hours</div>
            {(data.working_hours || []).map((w) => <Kv key={w.weekday} k={days[w.weekday]} v={w.is_open ? `${String(w.open_time).slice(0, 5)} – ${String(w.close_time).slice(0, 5)}` : 'Closed'} />)}
          </div>
        </>
      )}
    </Shell>
  )
}

export function About() {
  return (
    <Shell title="About M.G TRUST MEDICAL" nav={patientNav}>
      <div className="about">
        <LogoMark size={84} />
        <h2>M.G TRUST MEDICAL</h2>
        <p className="muted">Smart Management | Better Care | Healthier Community</p>
        <p>M.G TRUST MEDICAL is a modern healthcare centre committed to providing quality medical services, accurate diagnosis and trusted care for our community.</p>
        <p className="muted">Version 2.0.0</p>
      </div>
    </Shell>
  )
}
