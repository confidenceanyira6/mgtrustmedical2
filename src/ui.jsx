import { useCallback, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, FileText, Home, MessageSquare, MoreHorizontal, Package, Stethoscope, User, Users, X } from 'lucide-react'
import { useAuth } from './auth'
import { rpc } from './supabase'

const TZ = 'Africa/Lagos'
export const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG')
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '—')
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '')
export const fmtDT = (d) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—')
export const todayLagos = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ })

export const patientNav = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/appointments', label: 'Appointments', Icon: CalendarDays },
  { to: '/results', label: 'Results', Icon: FileText },
  { to: '/messages', label: 'Messages', Icon: MessageSquare },
  { to: '/profile', label: 'Profile', Icon: User },
]
export const staffNav = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/patients', label: 'Patients', Icon: Users },
  { to: '/services', label: 'Services', Icon: Stethoscope },
  { to: '/products', label: 'Products', Icon: Package },
  { to: '/more', label: 'More', Icon: MoreHorizontal },
]

export function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 58C10 42 4 30 4 20 4 12 10 6 18 6c6 0 11 3 14 8 3-5 8-8 14-8 8 0 14 6 14 14 0 10-6 22-28 38z" fill="#1570ef" />
      <path d="M12 32h12l5-10 7 20 5-10h11" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Shell({ title, back = true, right, nav, header, children }) {
  const navigate = useNavigate()
  const { toastMsg } = useAuth()
  return (
    <div className="phone">
      {header || (
        <header className="topbar">
          {back && (
            <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={20} /></button>
          )}
          <h1>{title}</h1>
          <div className="topbar-right">{right}</div>
        </header>
      )}
      <main className="content">{children}</main>
      {nav && (
        <nav className="bottom-nav" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={20} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  )
}

export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }))
    return fn()
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((e) => setState({ data: null, error: e.message || 'Something went wrong', loading: false }))
  }, deps)
  useEffect(() => { run() }, [run])
  return { ...state, reload: run }
}

export function Loader({ loading, error, reload }) {
  if (loading) return <div className="empty">Loading…</div>
  if (error) {
    return (
      <div className="empty">
        {error}<br />
        {reload && <button type="button" className="link-btn" onClick={reload}>Try again</button>}
      </div>
    )
  }
  return null
}

const PILL = {
  pending_confirmation: ['Pending', 'warn'], confirmed: ['Confirmed', 'ok'], rescheduled: ['Rescheduled', 'warn'],
  checked_in: ['Checked in', 'ok'], sample_received: ['Sample received', 'ok'], in_progress: ['In progress', 'info'],
  completed: ['Completed', 'info'], cancelled: ['Cancelled', 'bad'], no_show: ['Missed', 'bad'],
}
export function Pill({ status }) {
  const [t, c] = PILL[status] || [String(status || '').replace(/_/g, ' '), 'info']
  return <span className={`pill ${c}`}>{t}</span>
}

export const Kv = ({ k, v }) => (<div className="kv"><span>{k}</span><b>{v}</b></div>)

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button type="button" key={o} className={o === value ? 'active' : ''} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  )
}

export function Sheet({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SlotPicker({ date, setDate, slot, setSlot }) {
  const [slots, setSlots] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    if (!date) { setSlots(null); return undefined }
    let live = true
    setSlots(null); setErr('')
    rpc('get_available_slots', { p_date: date })
      .then((d) => live && setSlots(d))
      .catch((e) => live && setErr(e.message))
    return () => { live = false }
  }, [date])
  const open = (slots || []).filter((s) => s.remaining > 0)
  return (
    <>
      <input className="input" type="date" min={todayLagos()} value={date} onChange={(e) => { setDate(e.target.value); setSlot('') }} />
      {err && <p className="err">{err}</p>}
      {date && !slots && !err && <p className="muted">Loading available times…</p>}
      {slots && (open.length ? (
        <div className="slots">
          {open.map((s) => (
            <button type="button" key={s.start} className={`slot ${slot === s.start ? 'active' : ''}`} onClick={() => setSlot(s.start)}>
              {fmtTime(s.start)}
            </button>
          ))}
        </div>
      ) : <p className="muted">No available times on this date. Try another day.</p>)}
    </>
  )
}
