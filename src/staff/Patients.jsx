import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '../auth'
import { rpc } from '../supabase'
import { useLoad, Loader, Sheet, fmtDate } from '../ui'
import { SShell, useRole, useDebounced } from './common'

export function Patients() {
  const navigate = useNavigate()
  const { toast } = useAuth()
  const { front } = useRole()
  const [q, setQ] = useState('')
  const term = useDebounced(q.trim())
  const [open, setOpen] = useState(false)
  const blank = { full_name: '', sex: '', phone: '', address: '', age: '', dob: '', email: '' }
  const [f, setF] = useState(blank)
  const [force, setForce] = useState(false)
  const [busy, setBusy] = useState(false)
  const { data, loading, error, reload } = useLoad(() => rpc('search_patients', { p_q: term }), [term])

  const save = async () => {
    if (f.full_name.trim().length < 2) return toast('Enter the patient name')
    setBusy(true)
    try {
      await rpc('staff_register_patient', { p_full_name: f.full_name.trim(), p_sex: f.sex || null, p_phone: f.phone.trim() || null, p_address: f.address.trim() || null, p_date_of_birth: f.dob || null, p_age: f.age ? Number(f.age) : null, p_email: f.email.trim() || null, p_force: force })
      toast('Patient registered'); setOpen(false); setF(blank); setForce(false); reload()
    } catch (e) {
      toast(e.message)
      if (/similar|duplicate|already/i.test(e.message)) setForce(true)
    } finally { setBusy(false) }
  }
  return (
    <SShell title="Patient Registration" back={false} right={front && <button type="button" className="icon-btn blue" onClick={() => setOpen(true)} aria-label="Register patient"><Plus size={22} /></button>}>
      <div className="search"><Search size={16} /><input placeholder="Search name, ID or phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (data.length ? (
        <div className="list">
          {data.map((p) => (
            <div className="row" key={p.id}>
              <div className="row-main"><div className="row-title">{p.full_name}</div>
                <div className="row-sub">{[p.patient_code, p.age ? `${p.age}y` : null, p.sex, p.phone].filter(Boolean).join(' · ')}</div>
                {p.last_visit && <div className="row-sub">Last visit {fmtDate(p.last_visit)}</div>}</div>
              {front && <button type="button" className="btn-view" onClick={() => navigate('/billing/new', { state: { patient: p } })}>Bill</button>}
            </div>
          ))}
        </div>
      ) : <div className="empty">No patients found.</div>)}
      <Sheet open={open} title="Register patient" onClose={() => setOpen(false)}>
        <div className="form">
          <label>Full name</label><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <div className="gender">{['male', 'female'].map((s) => <button type="button" key={s} className={f.sex === s ? 'active' : ''} onClick={() => setF({ ...f, sex: s })}>{s === 'male' ? 'Male' : 'Female'}</button>)}</div>
          <div className="two"><div><label>Age</label><input className="input" type="number" min="0" max="120" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} /></div><div><label>Or date of birth</label><input className="input" type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} /></div></div>
          <label>Phone</label><input className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <label>Email (optional)</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <label>Address</label><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          {force && <p className="muted">A similar patient already exists. Tap Register again only if this is a different person.</p>}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Register</button>
        </div>
      </Sheet>
    </SShell>
  )
}
