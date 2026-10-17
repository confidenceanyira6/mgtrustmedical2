import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { LogOut, Package, Plus, Search, Stethoscope, Users } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { Shell, useLoad, Loader, Kv, Sheet, LogoMark, naira, fmtDate, staffNav } from '../ui'

const ROLE = { admin: 'Administrator', receptionist: 'Receptionist', lab_staff: 'Laboratory staff', cashier: 'Cashier', lab_reviewer: 'Lab reviewer', sales_staff: 'Sales staff' }

function StaffHome() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const tiles = [
    { Icon: Users, label: 'Patients', to: '/patients' },
    { Icon: Stethoscope, label: 'Service & Laboratory', to: '/services' },
    { Icon: Package, label: 'Products', to: '/products' },
  ]
  return (
    <Shell title="M.G TRUST MEDICAL" back={false} nav={staffNav} right={<LogoMark size={28} />}>
      <div className="welcome"><h2>Hello, {(profile.full_name || profile.email || '').split(' ')[0]}</h2><p>{ROLE[profile.role] || profile.role}</p></div>
      <div className="quick four">
        {tiles.map(({ Icon, label, to }) => (<button type="button" key={label} onClick={() => navigate(to)}><span><Icon size={20} /></span>{label}</button>))}
      </div>
      <div className="card"><p className="muted">Billing, sales, lab results, analytics and reports are coming to this app next.</p></div>
    </Shell>
  )
}

function Patients() {
  const { toast } = useAuth()
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ full_name: '', sex: '', phone: '', address: '', age: '', email: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(t) }, [q])
  const { data, loading, error, reload } = useLoad(() => rpc('search_patients', { p_q: term }), [term])

  const save = async () => {
    if (f.full_name.trim().length < 2) return toast('Enter the patient name')
    setBusy(true)
    try {
      await rpc('staff_register_patient', { p_full_name: f.full_name.trim(), p_sex: f.sex || null, p_phone: f.phone.trim() || null, p_address: f.address.trim() || null, p_date_of_birth: null, p_age: f.age ? Number(f.age) : null, p_email: f.email.trim() || null, p_force: false })
      toast('Patient registered'); setOpen(false); setF({ full_name: '', sex: '', phone: '', address: '', age: '', email: '' }); reload()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  return (
    <Shell title="Patients" back={false} nav={staffNav} right={<button type="button" className="icon-btn blue" onClick={() => setOpen(true)} aria-label="Register patient"><Plus size={22} /></button>}>
      <div className="search"><Search size={16} /><input placeholder="Search name, ID or phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (data.length ? (
        <div className="list">
          {data.map((p) => (
            <div className="row" key={p.id}>
              <div className="row-main"><div className="row-title">{p.full_name}</div>
                <div className="row-sub">{[p.patient_code, p.age ? `${p.age}y` : null, p.sex, p.phone].filter(Boolean).join(' · ')}</div></div>
              <span className="row-sub">{p.last_visit ? fmtDate(p.last_visit) : ''}</span>
            </div>
          ))}
        </div>
      ) : <div className="empty">No patients found.</div>)}
      <Sheet open={open} title="Register patient" onClose={() => setOpen(false)}>
        <div className="form">
          <label>Full name</label><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <div className="gender">{['male', 'female'].map((s) => <button type="button" key={s} className={f.sex === s ? 'active' : ''} onClick={() => setF({ ...f, sex: s })}>{s === 'male' ? 'Male' : 'Female'}</button>)}</div>
          <label>Age</label><input className="input" type="number" min="0" max="120" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} />
          <label>Phone</label><input className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <label>Email (optional)</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <label>Address</label><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Register</button>
        </div>
      </Sheet>
    </Shell>
  )
}

function Services() {
  const { profile, toast } = useAuth()
  const isAdmin = profile.role === 'admin'
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('services').select('id,name,price,is_active,service_categories(name,is_laboratory)').order('name')))
  const [edit, setEdit] = useState(null)
  const [price, setPrice] = useState('')
  const save = async () => {
    const p = Number(price)
    if (!(p >= 0)) return toast('Enter a valid price')
    try { await query(supabase.from('services').update({ price: p }).eq('id', edit.id)); toast('Price updated'); setEdit(null); reload() } catch (e) { toast(e.message) }
  }
  return (
    <Shell title="Service & Laboratory" back={false} nav={staffNav}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (
        <div className="list">
          {data.map((s) => (
            <div className="row" key={s.id} onClick={() => isAdmin && (setEdit(s), setPrice(String(s.price)))}>
              <div className="row-main"><div className="row-title">{s.name}</div><div className="row-sub">{s.service_categories?.name}{s.is_active ? '' : ' · Inactive'}</div></div>
              <b>{naira(s.price)}</b>
            </div>
          ))}
        </div>
      )}
      {isAdmin && <p className="muted center">Tap a service to edit its price.</p>}
      <Sheet open={!!edit} title={edit?.name || ''} onClose={() => setEdit(null)}>
        <div className="form">
          <label>Price (₦)</label><input className="input" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button type="button" className="btn btn-primary" onClick={save}>Save price</button>
        </div>
      </Sheet>
    </Shell>
  )
}

function Products() {
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('products').select('id,name,selling_price,quantity_in_stock,reorder_level,is_active').order('name')))
  return (
    <Shell title="Products" back={false} nav={staffNav}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (data.length ? (
        <div className="list">
          {data.map((p) => (
            <div className="row" key={p.id}>
              <div className="row-main"><div className="row-title">{p.name}</div><div className="row-sub">{naira(p.selling_price)}</div></div>
              <div className="stock-end"><b>{p.quantity_in_stock}</b>{p.quantity_in_stock <= p.reorder_level && <span className="badge warn">Low stock</span>}</div>
            </div>
          ))}
        </div>
      ) : <div className="empty">No products yet.</div>)}
    </Shell>
  )
}

function More() {
  const { profile, signOut } = useAuth()
  return (
    <Shell title="More" back={false} nav={staffNav}>
      <div className="card">
        <div className="profile-name">{profile.full_name || profile.email}</div>
        <Kv k="Role" v={ROLE[profile.role] || profile.role} />
        <Kv k="Email" v={profile.email || '—'} />
      </div>
      <div className="list menu"><div className="row" onClick={signOut}><LogOut size={18} className="red" /><div className="row-main"><div className="row-title red">Log out</div></div></div></div>
    </Shell>
  )
}

export default function StaffApp() {
  return (
    <Routes>
      <Route path="/" element={<StaffHome />} />
      <Route path="/patients" element={<Patients />} />
      <Route path="/services" element={<Services />} />
      <Route path="/products" element={<Products />} />
      <Route path="/more" element={<More />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
