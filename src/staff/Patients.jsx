import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { useLoad, Loader, Sheet, naira, fmtDate } from '../ui'
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

export function Services() {
  const { toast } = useAuth()
  const { isAdmin } = useRole()
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('services').select('id,name,price,is_active,lab_category,patient_bookable,category_id,service_categories(name)').order('name')))
  const cats = useLoad(() => query(supabase.from('service_categories').select('id,name,is_laboratory').order('id')))
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [edit, setEdit] = useState(null)
  const [price, setPrice] = useState('')
  const [active, setActive] = useState(true)
  const [add, setAdd] = useState(false)
  const [n, setN] = useState({ name: '', category_id: '3', price: '' })
  const label = (s) => s.lab_category || s.service_categories?.name || 'Other'
  const groups = ['All', ...new Set((data || []).map(label))]
  const list = (data || []).filter((s) => (cat === 'All' || label(s) === cat) && s.name.toLowerCase().includes(q.trim().toLowerCase()))

  const save = async () => {
    const p = Number(price)
    if (!(p >= 0)) return toast('Enter a valid price')
    try { await query(supabase.from('services').update({ price: p, is_active: active }).eq('id', edit.id)); toast('Saved'); setEdit(null); reload() } catch (e) { toast(e.message) }
  }
  const create = async () => {
    if (!n.name.trim() || !(Number(n.price) >= 0)) return toast('Enter a name and price')
    const isLab = (cats.data || []).find((c) => String(c.id) === n.category_id)?.is_laboratory
    try {
      await query(supabase.from('services').insert({ name: n.name.trim(), category_id: Number(n.category_id), price: Number(n.price), is_active: true, patient_bookable: false, submission_methods: ['visit'], ...(isLab ? { lab_category: 'Other' } : {}) }))
      toast('Service added'); setAdd(false); setN({ name: '', category_id: '3', price: '' }); reload()
    } catch (e) { toast(e.message) }
  }
  return (
    <SShell title="Tests & Prices" back={false} right={isAdmin && <button type="button" className="icon-btn blue" onClick={() => setAdd(true)} aria-label="Add service"><Plus size={22} /></button>}>
      <div className="search"><Search size={16} /><input placeholder="Search tests and services…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips">{groups.map((g) => <button type="button" key={g} className={g === cat ? 'active' : ''} onClick={() => setCat(g)}>{g}</button>)}</div>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (
        <div className="list">
          {list.map((s) => (
            <div className="row" key={s.id} onClick={() => isAdmin && (setEdit(s), setPrice(String(s.price)), setActive(s.is_active))}>
              <div className="row-main"><div className="row-title">{s.name}</div><div className="row-sub">{label(s)}{s.is_active ? '' : ' · Inactive'}{Number(s.price) === 0 ? ' · Price not set' : ''}</div></div>
              <b>{naira(s.price)}</b>
            </div>
          ))}
        </div>
      )}
      {isAdmin && <p className="muted center">Tap a test to change its price. Prices shown are starting values; set them to your own rates.</p>}
      <Sheet open={!!edit} title={edit?.name || ''} onClose={() => setEdit(null)}>
        <div className="form">
          <label>Price (₦)</label><input className="input" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          <label className="check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active (available for billing)</label>
          <button type="button" className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </Sheet>
      <Sheet open={add} title="Add service" onClose={() => setAdd(false)}>
        <div className="form">
          <label>Name</label><input className="input" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <label>Category</label><select className="input" value={n.category_id} onChange={(e) => setN({ ...n, category_id: e.target.value })}>{(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <label>Price (₦)</label><input className="input" type="number" min="0" value={n.price} onChange={(e) => setN({ ...n, price: e.target.value })} />
          <button type="button" className="btn btn-primary" onClick={create}>Add service</button>
        </div>
      </Sheet>
    </SShell>
  )
}
