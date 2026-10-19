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

const addDays = (s, n) => { const d = new Date(`${s}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const dayLabel = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ })
const hourOf = (iso) => Number(new Date(iso).toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: TZ }))
const GROUPS = [['Morning', (h) => h < 12], ['Afternoon', (h) => h >= 12 && h < 17], ['Evening', (h) => h >= 17]]

// Pick a day (days with no free times are greyed out), then pick a time. Everything comes from the centre's real schedule.
export function SlotPicker({ date, setDate, slot, setSlot }) {
  const [days, setDays] = useState(null)
  const [failed, setFailed] = useState('')
  const [custom, setCustom] = useState(null)
  const [showOther, setShowOther] = useState(false)

  useEffect(() => {
    let live = true
    const start = todayLagos()
    const list = Array.from({ length: 14 }, (_, i) => addDays(start, i))
    Promise.all(list.map((d) => rpc('get_available_slots', { p_date: d })
      .then((s) => ({ date: d, slots: (s || []).filter((x) => x.remaining > 0) }))
      .catch((e) => ({ date: d, slots: [], error: e.message }))))
      .then((r) => {
        if (!live) return
        setDays(r)
        if (r.every((x) => x.error)) setFailed(r[0].error)
        else if (!date) {
          const first = r.find((x) => x.slots.length)
          if (first) setDate(first.date)
        }
      })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inRange = days?.find((d) => d.date === date)
  useEffect(() => {
    if (!date || !days || inRange) { setCustom(null); return undefined }
    let live = true
    setCustom(null)
    rpc('get_available_slots', { p_date: date })
      .then((s) => live && setCustom((s || []).filter((x) => x.remaining > 0)))
      .catch(() => live && setCustom([]))
    return () => { live = false }
  }, [date, days, inRange])

  const slots = inRange ? inRange.slots : custom
  const pick = (d) => { setDate(d); setSlot('') }
  return (
    <div className="stack">
      {!days && <p className="muted">Loading available days…</p>}
      {failed && <p className="err">{failed}</p>}
      {days && (
        <>
          <div className="chips">
            {days.map((d) => (
              <button type="button" key={d.date} disabled={!d.slots.length} style={{ opacity: d.slots.length ? 1 : 0.4 }} className={d.date === date ? 'active' : ''} onClick={() => { pick(d.date); setShowOther(false) }}>{dayLabel(d.date)}</button>
            ))}
          </div>
          <button type="button" className="link-btn right" onClick={() => setShowOther(!showOther)}>{showOther ? 'Hide' : 'Pick another date'}</button>
          {showOther && <input className="input" type="date" min={todayLagos()} value={date} onChange={(e) => pick(e.target.value)} />}
          <div className="card-title" style={{ marginBottom: 0 }}>Choose a time</div>
          {!date && <p className="muted">No days with free times in the next two weeks. Try "Pick another date".</p>}
          {date && !slots && <p className="muted">Loading times…</p>}
          {date && slots && (slots.length ? GROUPS.map(([name, test]) => {
            const g = slots.filter((s) => test(hourOf(s.start)))
            return g.length ? (
              <div key={name}>
                <div className="muted" style={{ margin: '4px 0 6px' }}>{name}</div>
                <div className="slots">
                  {g.map((s) => (<button type="button" key={s.start} className={`slot ${slot === s.start ? 'active' : ''}`} onClick={() => setSlot(s.start)}>{fmtTime(s.start)}</button>))}
                </div>
              </div>
            ) : null
          }) : <p className="muted">No times are free on this day. The centre may be closed or fully booked. Try another day.</p>)}
          {slot && <p className="muted"><b>Selected:</b> {fmtDate(slot)} at {fmtTime(slot)}</p>}
        </>
      )}
    </div>
  )
}
