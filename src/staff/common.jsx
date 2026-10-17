import { useEffect, useState } from 'react'
import { CalendarDays, FlaskConical, Home, MoreHorizontal, Receipt, Search, ShoppingCart, Users, X } from 'lucide-react'
import { useAuth } from '../auth'
import { rpc } from '../supabase'
import { Shell } from '../ui'

export const ROLES = { admin: 'Administrator', receptionist: 'Receptionist', lab_staff: 'Laboratory staff', cashier: 'Cashier', lab_reviewer: 'Lab reviewer', sales_staff: 'Sales staff' }
export const FRONT = ['admin', 'receptionist', 'cashier']
export const LAB = ['admin', 'lab_staff', 'lab_reviewer']
export const SALES = ['admin', 'cashier', 'sales_staff', 'receptionist']

export function useRole() {
  const { profile } = useAuth()
  const role = profile?.role
  return {
    role,
    isAdmin: role === 'admin',
    front: FRONT.includes(role),
    lab: LAB.includes(role),
    sales: SALES.includes(role),
    enterResults: ['admin', 'lab_staff'].includes(role),
    reviewer: ['admin', 'lab_reviewer'].includes(role),
  }
}

export function allow(role, key) {
  if (key === 'all') return true
  if (key === 'front') return FRONT.includes(role)
  if (key === 'lab') return LAB.includes(role)
  if (key === 'fl') return FRONT.includes(role) || LAB.includes(role)
  if (key === 'sales') return SALES.includes(role)
  if (key === 'admin') return role === 'admin'
  return false
}

export function staffNavFor(role) {
  const home = { to: '/', label: 'Home', Icon: Home, end: true }
  const more = { to: '/more', label: 'More', Icon: MoreHorizontal }
  if (FRONT.includes(role)) return [home, { to: '/patients', label: 'Patients', Icon: Users }, { to: '/billing', label: 'Billing', Icon: Receipt }, { to: '/lab', label: 'Lab', Icon: FlaskConical }, more]
  if (LAB.includes(role)) return [home, { to: '/lab', label: 'Lab', Icon: FlaskConical }, { to: '/appointments', label: 'Appointments', Icon: CalendarDays }, more]
  return [home, { to: '/sales', label: 'Sales', Icon: ShoppingCart }, more]
}

export function SShell(props) {
  const { profile } = useAuth()
  return <Shell nav={staffNavFor(profile.role)} {...props} />
}

export function PatientPicker({ value, onChange }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState([])
  useEffect(() => {
    if (q.trim().length < 2) { setList([]); return undefined }
    let live = true
    const t = setTimeout(() => {
      rpc('search_patients', { p_q: q.trim() }).then((d) => live && setList((d || []).slice(0, 6))).catch(() => live && setList([]))
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [q])
  if (value) {
    return (
      <div className="picked">
        <div><b>{value.full_name}</b><div className="row-sub">{value.patient_code}</div></div>
        <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label="Clear patient"><X size={16} /></button>
      </div>
    )
  }
  return (
    <>
      <div className="search"><Search size={16} /><input placeholder="Search patient name, ID or phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {list.length > 0 && (
        <div className="list">
          {list.map((p) => (
            <div className="row" key={p.id} onClick={() => { onChange(p); setQ('') }}>
              <div className="row-main"><div className="row-title">{p.full_name}</div><div className="row-sub">{[p.patient_code, p.phone].filter(Boolean).join(' · ')}</div></div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}
