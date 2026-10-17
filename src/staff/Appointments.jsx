import { useState } from 'react'
import { useAuth } from '../auth'
import { rpc } from '../supabase'
import { useLoad, Loader, Kv, Pill, Sheet, SlotPicker, fmtDT, todayLagos } from '../ui'
import { SShell, useRole } from './common'

const CHIPS = [['', 'All'], ['pending_confirmation', 'Pending'], ['confirmed', 'Confirmed'], ['rescheduled', 'Rescheduled'], ['checked_in', 'Checked in'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['no_show', 'Missed']]
const addDays = (s, n) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

export function Appointments() {
  const { toast } = useAuth()
  const { front } = useRole()
  const [from, setFrom] = useState(todayLagos())
  const [to, setTo] = useState(addDays(todayLagos(), 14))
  const [status, setStatus] = useState('')
  const list = useLoad(() => rpc('list_appointments', { p_from: from || null, p_to: to || null, p_status: status || null, p_service: null, p_limit: 200 }), [from, to, status])
  const [sel, setSel] = useState(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [resched, setResched] = useState(false)
  const [busy, setBusy] = useState(false)

  const close = () => { setSel(null); setNote(''); setDate(''); setSlot(''); setResched(false) }
  const act = async (action, msg, extra = {}) => {
    setBusy(true)
    try { await rpc('staff_update_appointment', { p_id: sel.id, p_action: action, p_slot: extra.slot || null, p_note: extra.note || null }); toast(msg); close(); await list.reload() } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const st = sel?.status
  const upcoming = ['pending_confirmation', 'confirmed', 'rescheduled'].includes(st)
  return (
    <SShell title="Appointments" back={false}>
      <div className="two"><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <div className="chips">{CHIPS.map(([k, v]) => <button type="button" key={k} className={k === status ? 'active' : ''} onClick={() => setStatus(k)}>{v}</button>)}</div>
      <Loader loading={list.loading} error={list.error} reload={list.reload} />
      {list.data && (list.data.length ? (
        <div className="list">
          {list.data.map((a) => (
            <div className="row" key={a.id} onClick={() => setSel(a)}>
              <div className="row-main">
                <div className="row-title">{a.patient_name}</div>
                <div className="row-sub">{a.reference} · {(a.tests || []).join(', ') || 'No tests'}</div>
                <div className="row-sub">{a.slot_start ? fmtDT(a.slot_start) : 'No time slot'}{a.reschedule_requested_at ? ' · Reschedule requested' : ''}</div>
              </div>
              <Pill status={a.status} />
            </div>
          ))}
        </div>
      ) : <div className="empty">No appointments in this range.</div>)}

      <Sheet open={!!sel} title={sel?.reference || ''} onClose={close}>
        {sel && (
          <div className="form">
            <Kv k="Patient" v={`${sel.patient_name} (${sel.patient_code})`} />
            {sel.phone && <Kv k="Phone" v={sel.phone} />}
            <Kv k="Tests" v={(sel.tests || []).join(', ') || '—'} />
            <Kv k="Time" v={sel.slot_start ? fmtDT(sel.slot_start) : '—'} />
            <Kv k="Submission" v={sel.submission_method} />
            {sel.reschedule_requested_slot && <Kv k="Patient asked for" v={fmtDT(sel.reschedule_requested_slot)} />}
            {sel.reschedule_reason && <Kv k="Reason" v={sel.reschedule_reason} />}
            {(sel.notes || []).slice(0, 3).map((n, i) => <p key={i} className="muted">Note: {n.note}</p>)}
            {front && (
              <div className="stack">
                {['pending_confirmation', 'rescheduled'].includes(st) && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act('confirm', 'Confirmed')}>Confirm appointment</button>}
                {upcoming && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => act('check_in', 'Checked in')}>Check in</button>}
                {upcoming && sel.reschedule_requested_slot && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => act('reschedule', 'Rescheduled')}>Approve requested time</button>}
                {upcoming && <button type="button" className="btn btn-outline" onClick={() => setResched(!resched)}>Choose a new time</button>}
                {resched && (<><SlotPicker date={date} setDate={setDate} slot={slot} setSlot={setSlot} /><button type="button" className="btn btn-primary" disabled={busy || !slot} onClick={() => act('reschedule', 'Rescheduled', { slot })}>Reschedule</button></>)}
                {upcoming && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => act('no_show', 'Marked as missed')}>Mark as no-show</button>}
              </div>
            )}
            <label>Note / cancel reason</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="btn-row">
              <button type="button" className="btn btn-outline" disabled={busy || !note.trim()} onClick={() => act('note', 'Note added', { note })}>Add note</button>
              {front && ['pending_confirmation', 'confirmed', 'rescheduled', 'checked_in'].includes(st) && <button type="button" className="btn btn-outline danger" disabled={busy} onClick={() => act('cancel', 'Cancelled', { note })}>Cancel</button>}
            </div>
          </div>
        )}
      </Sheet>
    </SShell>
  )
}
