import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FlaskConical, Search } from 'lucide-react'
import { useAuth } from '../auth'
import { rpc } from '../supabase'
import { Shell, useLoad, Loader, Kv, SlotPicker, naira, patientNav } from '../ui'

const useCatalogue = () => useLoad(() => rpc('get_lab_catalogue'))

function Instructions({ t, method }) {
  const items = method === 'remote'
    ? [['Packaging', t.remote_packaging_instructions], ['Delivery', t.remote_delivery_instructions], ['Identification', t.sample_identification_requirements], ['Keeping the sample stable', t.sample_stability_instructions]]
    : [['Before your visit', t.preparation_instructions], ['Sample collection', t.sample_collection_requirements]]
  const shown = items.filter(([, v]) => v)
  if (!shown.length) return <p className="muted">No special instructions for this test.</p>
  return shown.map(([k, v]) => (<div key={k} className="instr"><b>{k}</b><p>{v}</p></div>))
}

export function LabServices() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useCatalogue()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const cats = ['All', ...new Set((data || []).map((t) => t.category).filter(Boolean))]
  const list = (data || []).filter((t) => (cat === 'All' || t.category === cat) && t.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Shell title="Laboratory Services" nav={patientNav}>
      <div className="search"><Search size={16} /><input placeholder="Search tests…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips">
        {cats.map((c) => (<button type="button" key={c} className={c === cat ? 'active' : ''} onClick={() => setCat(c)}>{c}</button>))}
      </div>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (list.length ? (
        <div className="list">
          {list.map((t) => (
            <div className="row" key={t.id} onClick={() => navigate(`/services/${t.id}`)}>
              <div className="ico blue-bg"><FlaskConical size={18} /></div>
              <div className="row-main">
                <div className="row-title">{t.name}</div>
                <div className="row-sub">{[t.sample_type, t.turnaround_hours ? `${t.turnaround_hours}h` : null].filter(Boolean).join(' · ')}</div>
                <div className="price">{naira(t.price)}</div>
              </div>
              <button type="button" className="btn-view" onClick={(e) => { e.stopPropagation(); navigate(`/book/${t.id}`) }}>Book Now</button>
            </div>
          ))}
        </div>
      ) : <div className="empty">No tests found.</div>)}
    </Shell>
  )
}

export function TestDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useCatalogue()
  const [more, setMore] = useState(false)
  const t = (data || []).find((x) => x.id === id)
  return (
    <Shell title={t?.name || 'Test Details'} nav={patientNav}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && !t && <div className="empty">This test isn't available for booking.</div>}
      {t && (
        <>
          <div className="card">
            <div className="test-head">
              <div className="ico blue-bg"><FlaskConical size={18} /></div>
              <div><div className="row-title">{t.name}</div><div className="price-big">{naira(t.price)}</div></div>
            </div>
            {t.description && <p className="muted" style={{ marginTop: 10 }}>{t.description}</p>}
          </div>
          <div className="card">
            <Kv k="Sample Type" v={t.sample_type || '—'} />
            <Kv k="Preparation" v={t.preparation_instructions || 'None'} />
            <Kv k="Turnaround Time" v={t.turnaround_hours ? `${t.turnaround_hours} hours` : '—'} />
            <Kv k="Remote Submission" v={t.remote_available ? 'Available' : 'Visit laboratory only'} />
            <Kv k="Appointment Required" v={t.appointment_required ? 'Yes' : 'No'} />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => navigate(`/book/${t.id}`)}>Book Appointment</button>
          <button type="button" className="btn btn-outline" onClick={() => setMore(!more)}>{more ? 'Hide Instructions' : 'View Instructions'}</button>
          {more && (
            <div className="card">
              <Instructions t={t} method="visit" />
              {t.remote_available && (<><div className="card-title" style={{ marginTop: 10 }}>Remote submission</div><Instructions t={t} method="remote" /></>)}
            </div>
          )}
        </>
      )}
    </Shell>
  )
}

export function BookTest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useAuth()
  const { data, loading, error, reload } = useCatalogue()
  const t = (data || []).find((x) => x.id === id)
  const [method, setMethod] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (t && !method) setMethod(t.submission_methods.includes('visit') ? 'visit' : 'remote')
  }, [t, method])

  const submit = async () => {
    if (t.appointment_required && !slot) return toast('Choose a date and time')
    setBusy(true)
    try {
      const a = await rpc('book_appointment', { p_service_ids: [t.id], p_method: method, p_slot: slot || null, p_note: note.trim() || null })
      navigate(`/appointments/${a.id}`, { replace: true })
    } catch (e) { toast(e.message); setBusy(false) }
  }

  return (
    <Shell title="Book Appointment" nav={patientNav}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && !t && <div className="empty">This test isn't available for booking.</div>}
      {t && (
        <>
          <div className="card"><div className="row-title">{t.name}</div><div className="price-big">{naira(t.price)}</div></div>
          <div className="card-title">Sample submission</div>
          <div className="method-list">
            {[['visit', 'Visit Laboratory', 'Blood / sample collection at the centre'], ['remote', 'Remote Submission', 'Collect at home and deliver']].map(([m, label, sub]) => {
              const ok = t.submission_methods.includes(m)
              return (
                <button type="button" key={m} disabled={!ok} className={`method ${method === m ? 'active' : ''}`} onClick={() => setMethod(m)}>
                  <b>{label}</b><span>{ok ? sub : 'Not available for this test'}</span>
                </button>
              )
            })}
          </div>
          {method && <div className="card"><Instructions t={t} method={method} /></div>}
          <div className="card-title">Select date{t.appointment_required ? '' : ' (optional)'}</div>
          <SlotPicker date={date} setDate={setDate} slot={slot} setSlot={setSlot} />
          <div className="card-title">Note (optional)</div>
          <textarea className="input area" rows={3} placeholder="Anything the lab should know?" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'Booking…' : 'Confirm Booking'}</button>
        </>
      )}
    </Shell>
  )
}
