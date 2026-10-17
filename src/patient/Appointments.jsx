import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarCheck, CheckCircle2, Clock, Navigation } from 'lucide-react'
import { useAuth } from '../auth'
import { rpc } from '../supabase'
import { mapsLink } from '../branch'
import { Shell, useLoad, Loader, Kv, Pill, Segmented, Sheet, SlotPicker, fmtDate, fmtTime, patientNav } from '../ui'

function bucket(a) {
  if (a.status === 'cancelled') return 'Cancelled'
  if (['completed', 'no_show'].includes(a.status)) return 'Past'
  const live = ['checked_in', 'sample_received', 'in_progress'].includes(a.status)
  if (!live && a.slot_start && new Date(a.slot_end || a.slot_start) < new Date()) return 'Past'
  return 'Upcoming'
}

export function MyAppointments() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useLoad(() => rpc('get_my_appointments'))
  const [tab, setTab] = useState('Upcoming')
  const list = (data || []).filter((a) => bucket(a) === tab)
  return (
    <Shell title="My Appointments" back={false} nav={patientNav}>
      <Segmented options={['Upcoming', 'Past', 'Cancelled']} value={tab} onChange={setTab} />
      <Loader loading={loading} error={error} reload={reload} />
      {data && (list.length ? (
        <div className="list">
          {list.map((a) => (
            <div className="row" key={a.id} onClick={() => navigate(`/appointments/${a.id}`)}>
              <div className="row-main">
                <div className="row-title">{a.reference}</div>
                <div className="row-sub">{a.tests.map((t) => t.name).join(', ') || 'Laboratory test'}</div>
                <div className="row-sub">{a.slot_start ? `${fmtDate(a.slot_start)}, ${fmtTime(a.slot_start)}` : 'No time slot'}{a.branch ? ` · ${a.branch.name}` : ''}</div>
              </div>
              <Pill status={a.status} />
            </div>
          ))}
        </div>
      ) : <div className="empty">No {tab.toLowerCase()} appointments.</div>)}
      <button type="button" className="btn btn-primary" onClick={() => navigate('/services')}>Book a Test</button>
    </Shell>
  )
}

export function AppointmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useAuth()
  const { data, loading, error, reload } = useLoad(() => rpc('get_my_appointments'), [id])
  const a = (data || []).find((x) => x.id === id)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reschedOpen, setReschedOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [busy, setBusy] = useState(false)

  const canChange = a && ['pending_confirmation', 'confirmed', 'rescheduled'].includes(a.status)
  const act = async (fn, msg) => {
    setBusy(true)
    try { await fn(); toast(msg); setCancelOpen(false); setReschedOpen(false); setReason(''); await reload() } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const cancel = () => act(() => rpc('patient_cancel_appointment', { p_id: id, p_reason: reason.trim() || null }), 'Appointment cancelled')
  const resched = () => {
    if (!slot) return toast('Choose a new date and time')
    return act(() => rpc('patient_request_reschedule', { p_id: id, p_new_slot: slot, p_reason: reason.trim() || null }), 'Reschedule requested')
  }

  const confirmed = a && ['confirmed', 'checked_in'].includes(a.status)
  return (
    <Shell title="Appointment" nav={patientNav}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && !a && <div className="empty">Appointment not found.</div>}
      {a && (
        <>
          <div className="card center-card">
            {confirmed ? <CheckCircle2 size={44} className="green" /> : a.status === 'cancelled' ? <CalendarCheck size={44} className="red" /> : <Clock size={44} className="orange" />}
            <h2 className="auth-title">{confirmed ? 'Appointment Confirmed' : a.status === 'pending_confirmation' ? 'Appointment Requested' : a.status === 'cancelled' ? 'Appointment Cancelled' : 'Appointment Details'}</h2>
            {a.status === 'pending_confirmation' && <p className="muted">The centre will confirm your appointment shortly. We'll notify you.</p>}
            <Pill status={a.status} />
          </div>
          <div className="card">
            <Kv k="Reference" v={a.reference} />
            {a.branch && <Kv k="Branch" v={a.branch.name} />}
            {a.branch && <Kv k="Address" v={[a.branch.address, a.branch.city].filter(Boolean).join(', ')} />}
            {a.branch?.phone && <Kv k="Branch phone" v={a.branch.phone} />}
            <Kv k="Test" v={a.tests.map((t) => t.name).join(', ') || '—'} />
            <Kv k="Date" v={a.slot_start ? fmtDate(a.slot_start) : '—'} />
            <Kv k="Time" v={a.slot_start ? fmtTime(a.slot_start) : '—'} />
            <Kv k="Submission" v={a.submission_method === 'remote' ? 'Remote' : 'Visit laboratory'} />
            {a.patient_note && <Kv k="Your note" v={a.patient_note} />}
          </div>
          {a.branch && <a className="btn btn-outline" href={mapsLink(a.branch)} target="_blank" rel="noreferrer"><Navigation size={16} /> Get directions</a>}
          {a.samples.length > 0 && (
            <div className="card">
              <div className="card-title">Samples</div>
              {a.samples.map((s) => (<Kv key={s.sample_number} k={`${s.sample_number} · ${s.sample_type}`} v={s.status} />))}
            </div>
          )}
          {canChange && (
            <div className="btn-row">
              {a.slot_start && <button type="button" className="btn btn-outline" onClick={() => setReschedOpen(true)}>Reschedule</button>}
              <button type="button" className="btn btn-outline danger" onClick={() => setCancelOpen(true)}>Cancel</button>
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>Back to Home</button>
        </>
      )}

      <Sheet open={cancelOpen} title="Cancel appointment" onClose={() => setCancelOpen(false)}>
        <div className="form">
          <label>Reason (optional)</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={cancel}>Cancel appointment</button>
        </div>
      </Sheet>
      <Sheet open={reschedOpen} title="Request a new time" onClose={() => setReschedOpen(false)}>
        <div className="form">
          <SlotPicker date={date} setDate={setDate} slot={slot} setSlot={setSlot} />
          <label>Reason (optional)</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={resched}>Send request</button>
        </div>
      </Sheet>
    </Shell>
  )
}
