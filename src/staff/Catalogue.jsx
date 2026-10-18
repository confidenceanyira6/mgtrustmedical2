import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navigation, Plus } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, query } from '../supabase'
import { mapsLink } from '../branch'
import { useLoad, Loader, Sheet } from '../ui'
import { SShell, useRole } from './common'

const blank = { name: '', address: '', city: '', state: '', phone: '', email: '', latitude: '', longitude: '', is_active: true }

export function Branches() {
  const navigate = useNavigate()
  const { toast } = useAuth()
  const { isAdmin } = useRole()
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('branches').select('*, branch_services(count)').order('name')))
  const [sheet, setSheet] = useState(null)
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)

  const open = (b) => {
    setF(b ? { name: b.name, address: b.address, city: b.city || '', state: b.state || '', phone: b.phone || '', email: b.email || '', latitude: b.latitude ?? '', longitude: b.longitude ?? '', is_active: b.is_active } : blank)
    setSheet(b ? b.id : 'new')
  }
  const locate = () => {
    if (!navigator.geolocation) return toast('Location is not available on this device')
    return navigator.geolocation.getCurrentPosition(
      (p) => setF((s) => ({ ...s, latitude: p.coords.latitude.toFixed(6), longitude: p.coords.longitude.toFixed(6) })),
      () => toast('Location permission was not granted'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  const save = async () => {
    if (!f.name.trim() || !f.address.trim()) return toast('Branch name and address are required')
    const hasLat = String(f.latitude).trim() !== ''
    const hasLng = String(f.longitude).trim() !== ''
    if (hasLat !== hasLng) return toast('Enter both latitude and longitude, or leave both blank')
    const lat = hasLat ? Number(f.latitude) : null
    const lng = hasLng ? Number(f.longitude) : null
    if (hasLat && (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180))) return toast('The location coordinates are not valid')
    const payload = { name: f.name.trim(), address: f.address.trim(), city: f.city.trim() || null, state: f.state.trim() || null, phone: f.phone.trim() || null, email: f.email.trim() || null, latitude: lat, longitude: lng, is_active: f.is_active }
    setBusy(true)
    try {
      if (sheet === 'new') await query(supabase.from('branches').insert(payload))
      else await query(supabase.from('branches').update(payload).eq('id', sheet))
      toast('Branch saved'); setSheet(null); reload()
    } catch (e) {
      toast(/branches_name_lower_key|duplicate/i.test(e.message) ? 'A branch with this name already exists' : e.message)
    } finally { setBusy(false) }
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <SShell title="Branches" back={false} right={isAdmin && <button type="button" className="icon-btn blue" onClick={() => open(null)} aria-label="Add branch"><Plus size={22} /></button>}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && !data.length && (
        <div className="banner">
          <b>No branches yet</b>
          <span className="muted">Patients can only book once a branch exists and has listed the tests it offers.</span>
          {isAdmin ? <button type="button" className="btn btn-primary" onClick={() => open(null)}>Register your first branch</button> : <span className="muted">Ask an administrator to add one.</span>}
        </div>
      )}
      {(data || []).map((b) => {
        const n = b.branch_services?.[0]?.count || 0
        return (
          <div className="card branch" key={b.id}>
            <div className="row" style={{ padding: 0, border: 0 }}>
              <div className="row-main"><div className="row-title">{b.name}</div><div className="row-sub">{[b.address, b.city, b.state].filter(Boolean).join(', ')}</div>{b.phone && <div className="row-sub">{b.phone}</div>}</div>
              <span className={`pill ${b.is_active ? 'ok' : 'warn'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="row-sub" style={{ margin: '8px 0' }}>{n ? `${n} ${n === 1 ? 'test/service' : 'tests & services'} listed` : 'Nothing listed yet'}</div>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/services?branch=${b.id}`)}>Tests & prices</button>
              {isAdmin ? <button type="button" className="btn btn-outline" onClick={() => open(b)}>Edit</button> : <a className="btn btn-outline" href={mapsLink(b)} target="_blank" rel="noreferrer"><Navigation size={15} /> Map</a>}
            </div>
          </div>
        )
      })}
      <Sheet open={sheet !== null} title={sheet === 'new' ? 'Register a branch' : 'Edit branch'} onClose={() => setSheet(null)}>
        <div className="form">
          <label>Branch name *</label><input className="input" value={f.name} onChange={set('name')} />
          <label>Street address *</label><input className="input" value={f.address} onChange={set('address')} />
          <div className="two"><div><label>City / town</label><input className="input" value={f.city} onChange={set('city')} /></div><div><label>State</label><input className="input" value={f.state} onChange={set('state')} /></div></div>
          <label>Phone</label><input className="input" type="tel" value={f.phone} onChange={set('phone')} />
          <label>Email</label><input className="input" type="email" value={f.email} onChange={set('email')} />
          <label>Map location (lets patients get directions and find the nearest branch)</label>
          <div className="two"><input className="input" inputMode="decimal" placeholder="Latitude" value={f.latitude} onChange={set('latitude')} /><input className="input" inputMode="decimal" placeholder="Longitude" value={f.longitude} onChange={set('longitude')} /></div>
          <button type="button" className="btn btn-outline" onClick={locate}><Navigation size={15} /> Use my current location</button>
          <p className="muted">Tap this while you are standing at the branch for an accurate pin.</p>
          <label className="check"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Open for patient bookings</label>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save branch'}</button>
        </div>
      </Sheet>
    </SShell>
  )
}

const LAB_CATS = ['Haematology', 'Chemistry', 'Microbiology', 'Parasitology', 'Serology & Immunology', 'Hormones', 'Urinalysis', 'Pregnancy & Fertility', 'Tumour Markers', 'Other']
const blankField = { label: '', type: 'numeric', unit: '', low: '', high: '', options: '' }
const blankTest = { kind: '3', name: '', lab_category: 'Chemistry', sample_type: '', tat: '', remote: false, prep: '', desc: '', fields: [blankField] }

export function TestsAndPrices() {
  const { profile, toast } = useAuth()
  const { isAdmin } = useRole()
  const [params, setParams] = useSearchParams()
  const branches = useLoad(() => query(supabase.from('branches').select('id,name').eq('is_active', true).order('name')))
  const branchId = params.get('branch') || profile.branch_id || branches.data?.[0]?.id || ''
  const master = useLoad(() => query(supabase.from('services').select('id,name,lab_category,turnaround_hours,service_categories(name)').eq('is_active', true).order('name')))
  const rows = useLoad(() => (branchId ? query(supabase.from('branch_services').select('service_id,price,is_available').eq('branch_id', branchId)) : Promise.resolve([])), [branchId])
  const [edits, setEdits] = useState({})
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [tab, setTab] = useState('Offered')
  const [copyOpen, setCopyOpen] = useState(false)
  const [src, setSrc] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [n, setN] = useState(blankTest)
  const [tat, setTat] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const m = {}
    ;(rows.data || []).forEach((r) => { m[r.service_id] = { on: r.is_available, price: String(r.price) } })
    setEdits(m)
  }, [rows.data])

  const label = (s) => s.lab_category || s.service_categories?.name || 'Other'
  const all = master.data || []
  const stored = Object.fromEntries((rows.data || []).map((r) => [r.service_id, r]))
  const cats = ['All', ...new Set(all.map(label))]
  const offeredCount = Object.values(edits).filter((e) => e.on).length
  const list = all.filter((s) => (cat === 'All' || label(s) === cat) && s.name.toLowerCase().includes(q.trim().toLowerCase()) && (tab === 'All' || edits[s.id]?.on))

  const toggle = (s) => setEdits((m) => ({ ...m, [s.id]: { on: !m[s.id]?.on, price: m[s.id]?.price || '' } }))
  const setPrice = (s, v) => setEdits((m) => ({ ...m, [s.id]: { on: Number(v) > 0 ? true : m[s.id]?.on || false, price: v } }))

  const save = async () => {
    const up = []
    const off = []
    for (const s of all) {
      const e = edits[s.id]
      const st = stored[s.id]
      if (e?.on) {
        const price = Number(e.price)
        if (!(price > 0)) return toast(`Enter a price for ${s.name}`)
        if (!st || !st.is_available || Number(st.price) !== price) up.push({ branch_id: branchId, service_id: s.id, price, is_available: true })
      } else if (st?.is_available) off.push(s.id)
    }
    if (!up.length && !off.length) return toast('No changes to save')
    setBusy(true)
    try {
      if (up.length) await query(supabase.from('branch_services').upsert(up, { onConflict: 'branch_id,service_id' }))
      if (off.length) await query(supabase.from('branch_services').update({ is_available: false }).eq('branch_id', branchId).in('service_id', off))
      toast('Saved'); await rows.reload()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  const copy = async () => {
    if (!src) return toast('Choose a branch to copy from')
    try {
      const d = await query(supabase.from('branch_services').select('service_id,price').eq('branch_id', src).eq('is_available', true))
      setEdits((m) => ({ ...m, ...Object.fromEntries(d.map((r) => [r.service_id, { on: true, price: String(r.price) }])) }))
      setCopyOpen(false)
      toast(`Copied ${d.length} items. Review them, then press Save.`)
    } catch (e) { toast(e.message) }
  }

  const saveTat = async () => {
    const h = tat.hours === '' ? null : Number(tat.hours)
    if (h !== null && !(h > 0)) return toast('Enter a number of hours')
    try { await query(supabase.from('services').update({ turnaround_hours: h }).eq('id', tat.id)); toast('Saved'); setTat(null); master.reload() } catch (e) { toast(e.message) }
  }

  const createTest = async () => {
    const isLab = n.kind === '3'
    if (!n.name.trim()) return toast('Enter the test or service name')
    const fields = isLab ? n.fields.filter((f) => f.label.trim()) : []
    if (isLab && !fields.length) return toast('Add at least one result field so the lab can enter results')
    for (const f of fields) {
      if (f.type === 'numeric' && f.low !== '' && f.high !== '' && Number(f.low) > Number(f.high)) return toast(`The reference range for ${f.label} is back to front`)
      if (f.type === 'qualitative' && f.options.split(',').map((x) => x.trim()).filter(Boolean).length < 2) return toast(`Give at least two options for ${f.label}, separated by commas`)
    }
    const hours = n.tat === '' ? null : Number(n.tat)
    if (hours !== null && !(hours > 0)) return toast('Turnaround must be a number of hours')
    setBusy(true)
    try {
      const s = await query(supabase.from('services').insert({
        category_id: Number(n.kind), name: n.name.trim(), price: 0, is_active: true, patient_bookable: false,
        lab_category: isLab ? n.lab_category : null, sample_type: isLab ? n.sample_type.trim() || null : null, turnaround_hours: hours,
        appointment_required: true, submission_methods: isLab && n.remote ? ['visit', 'remote'] : ['visit'],
        preparation_instructions: n.prep.trim() || null, description: n.desc.trim() || null,
      }).select('id').single())
      for (let i = 0; i < fields.length; i += 1) {
        const f = fields[i]
        const key = `${f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field'}_${i + 1}`
        const options = f.type === 'positive_negative' ? ['Negative', 'Positive'] : f.type === 'qualitative' ? f.options.split(',').map((x) => x.trim()).filter(Boolean) : null
        const fld = await query(supabase.from('lab_test_fields').insert({ service_id: s.id, field_key: key, label: f.label.trim(), field_type: f.type, unit: f.unit.trim() || null, options, sort_order: i + 1 }).select('id').single())
        if (f.type === 'numeric' && (f.low !== '' || f.high !== '')) {
          await query(supabase.from('lab_reference_ranges').insert({ field_id: fld.id, low: f.low === '' ? null : Number(f.low), high: f.high === '' ? null : Number(f.high) }))
        }
      }
      toast('Added. Now set its price for each branch that offers it.')
      setAddOpen(false); setN(blankTest); setTab('All'); master.reload()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const setField = (i, patch) => setN((s) => ({ ...s, fields: s.fields.map((f, k) => (k === i ? { ...f, ...patch } : f)) }))

  return (
    <SShell title="Tests & Prices" back={false} right={isAdmin && <button type="button" className="icon-btn blue" onClick={() => setAddOpen(true)} aria-label="Add test"><Plus size={22} /></button>}>
      <Loader loading={branches.loading} error={branches.error} reload={branches.reload} />
      {branches.data && !branches.data.length && (
        <div className="banner"><b>No branch yet</b><span className="muted">Prices belong to a branch. Register a branch first, then list the tests it offers.</span></div>
      )}
      {branches.data?.length > 0 && (
        <>
          <select className="input" value={branchId} onChange={(e) => setParams({ branch: e.target.value }, { replace: true })}>{branches.data.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <Segmented options={['Offered', 'All']} value={tab} onChange={setTab} />
          <div className="search"><Search size={16} /><input placeholder="Search tests and services…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="chips">{cats.map((g) => <button type="button" key={g} className={g === cat ? 'active' : ''} onClick={() => setCat(g)}>{g}</button>)}</div>
          <Loader loading={master.loading || rows.loading} error={master.error || rows.error} reload={() => { master.reload(); rows.reload() }} />
          {master.data && (
            <>
              <p className="muted">{offeredCount} offered at this branch{isAdmin && tab === 'All' ? '. Tick a test and enter your price for this branch.' : '.'}</p>
              {list.length ? (
                <div className="list">
                  {list.map((s) => {
                    const e = edits[s.id] || { on: false, price: '' }
                    return (
                      <div className="cart-row" key={s.id}>
                        {isAdmin && <input type="checkbox" checked={e.on} onChange={() => toggle(s)} aria-label={`Offer ${s.name}`} />}
                        <div className="row-main" onClick={() => isAdmin && setTat({ id: s.id, name: s.name, hours: s.turnaround_hours ?? '' })}>
                          <div className="row-title">{s.name}</div>
                          <div className="row-sub">{label(s)}{s.turnaround_hours ? ` · ${s.turnaround_hours}h` : ''}</div>
                        </div>
                        {isAdmin ? <input className="input" style={{ width: 110 }} type="number" min="0" inputMode="decimal" placeholder="Price ₦" value={e.price} onChange={(ev) => setPrice(s, ev.target.value)} /> : <b>{naira(e.price)}</b>}
                      </div>
                    )
                  })}
                </div>
              ) : <div className="empty">{tab === 'Offered' ? 'Nothing is offered at this branch yet.' : 'No matching tests.'}</div>}
              {isAdmin && (
                <div className="stack sticky-save">
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
                  {branches.data.length > 1 && <button type="button" className="btn btn-outline" onClick={() => setCopyOpen(true)}>Copy list & prices from another branch</button>}
                </div>
              )}
            </>
          )}
        </>
      )}

      <Sheet open={copyOpen} title="Copy from another branch" onClose={() => setCopyOpen(false)}>
        <div className="form">
          <select className="input" value={src} onChange={(e) => setSrc(e.target.value)}><option value="">Choose branch…</option>{(branches.data || []).filter((b) => b.id !== branchId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <p className="muted">This fills in the list and prices below. Nothing is saved until you press Save changes.</p>
          <button type="button" className="btn btn-primary" onClick={copy}>Copy</button>
        </div>
      </Sheet>
      <Sheet open={!!tat} title={tat?.name || ''} onClose={() => setTat(null)}>
        <div className="form">
          <label>Turnaround time (hours)</label>
          <input className="input" type="number" min="1" value={tat?.hours ?? ''} onChange={(e) => setTat({ ...tat, hours: e.target.value })} />
          <p className="muted">Used to set each result's due time. Leave blank if you do not promise one.</p>
          <button type="button" className="btn btn-primary" onClick={saveTat}>Save</button>
        </div>
      </Sheet>
      <Sheet open={addOpen} title="Add a test or service" onClose={() => setAddOpen(false)}>
        <div className="form">
          <label>Type</label>
          <select className="input" value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value })}><option value="3">Laboratory test</option><option value="2">Scan / imaging</option><option value="1">Consultation</option><option value="4">Other service</option></select>
          <label>Name *</label><input className="input" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <label>Description (optional)</label><input className="input" value={n.desc} onChange={(e) => setN({ ...n, desc: e.target.value })} />
          <label>Turnaround (hours, optional)</label><input className="input" type="number" min="1" value={n.tat} onChange={(e) => setN({ ...n, tat: e.target.value })} />
          <label>Preparation for the patient (optional)</label><input className="input" value={n.prep} onChange={(e) => setN({ ...n, prep: e.target.value })} />
          {n.kind === '3' && (<>
            <label>Lab section</label>
            <select className="input" value={n.lab_category} onChange={(e) => setN({ ...n, lab_category: e.target.value })}>{LAB_CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <label>Sample type (e.g. Blood, Urine, Swab)</label><input className="input" value={n.sample_type} onChange={(e) => setN({ ...n, sample_type: e.target.value })} />
            <label className="check"><input type="checkbox" checked={n.remote} onChange={(e) => setN({ ...n, remote: e.target.checked })} /> Patients may collect the sample themselves and deliver it</label>
            <div className="card-title" style={{ marginTop: 8 }}>Result fields</div>
            {n.fields.map((f, i) => (
              <div className="field-row" key={i}>
                <input className="input" placeholder="Result name, e.g. Haemoglobin" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                <select className="input" value={f.type} onChange={(e) => setField(i, { type: e.target.value })}><option value="numeric">Number</option><option value="text">Text</option><option value="positive_negative">Positive / Negative</option><option value="qualitative">Pick from options</option></select>
                {f.type === 'numeric' && (<><input className="input" placeholder="Unit, e.g. g/dL" value={f.unit} onChange={(e) => setField(i, { unit: e.target.value })} /><div className="two"><input className="input" inputMode="decimal" placeholder="Normal low" value={f.low} onChange={(e) => setField(i, { low: e.target.value })} /><input className="input" inputMode="decimal" placeholder="Normal high" value={f.high} onChange={(e) => setField(i, { high: e.target.value })} /></div></>)}
                {f.type === 'qualitative' && <input className="input" placeholder="Options, separated by commas" value={f.options} onChange={(e) => setField(i, { options: e.target.value })} />}
                {n.fields.length > 1 && <button type="button" className="link-btn" onClick={() => setN({ ...n, fields: n.fields.filter((_, k) => k !== i) })}>Remove</button>}
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={() => setN({ ...n, fields: [...n.fields, blankField] })}>Add another result field</button>
          </>)}
          <p className="muted">The price is set per branch after you add it.</p>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={createTest}>{busy ? 'Adding…' : 'Add'}</button>
        </div>
      </Sheet>
    </SShell>
  )
}
