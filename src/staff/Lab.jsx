import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { useLoad, Loader, Kv, Sheet, fmtDT } from '../ui'
import { SShell, useRole, useDebounced } from './common'

export const STAGE = {
  awaiting_appointment: 'Awaiting appointment', appointment_confirmed: 'Appointment confirmed', awaiting_sample: 'Awaiting sample',
  sample_received: 'Sample received', sample_under_review: 'Sample under review', sample_accepted: 'Ready to process', processing: 'Processing',
  awaiting_review: 'Awaiting review', recollection_required: 'Recollection required', result_approved: 'Approved', report_released: 'Released',
}
const stageTone = (s) => (['result_approved', 'report_released'].includes(s) ? 'ok' : ['awaiting_review', 'recollection_required', 'sample_under_review'].includes(s) ? 'warn' : 'info')
const CHIPS = [['', 'All'], ['awaiting_sample', 'Awaiting sample'], ['sample_under_review', 'Sample review'], ['sample_accepted', 'To process'], ['processing', 'Processing'], ['awaiting_review', 'Review'], ['result_approved', 'Approved'], ['report_released', 'Released'], ['overdue', 'Overdue']]

export function Lab() {
  const navigate = useNavigate()
  const [stage, setStage] = useState('')
  const [q, setQ] = useState('')
  const term = useDebounced(q.trim())
  const dash = useLoad(() => rpc('lab_dashboard'))
  const list = useLoad(() => rpc('lab_worklist', { p_stage: stage || null, p_search: term || null, p_limit: 100 }), [stage, term])
  const d = dash.data || {}
  const stats = [['awaiting_sample', 'Samples awaiting', d.samples_awaiting_receipt], ['sample_accepted', 'To process', d.awaiting_processing], ['processing', 'In progress', d.in_progress], ['awaiting_review', 'Awaiting review', d.awaiting_review], ['result_approved', 'Awaiting release', d.awaiting_release], ['overdue', 'Overdue', d.overdue, true]]
  return (
    <SShell title="Laboratory" back={false}>
      <div className="stat-grid">
        {stats.map(([k, label, n, alert]) => (
          <div key={k} className={`stat ${alert && n > 0 ? 'alert' : ''}`} onClick={() => setStage(k)}><b>{dash.loading ? '…' : n ?? 0}</b><span>{label}</span></div>
        ))}
      </div>
      <div className="search"><input placeholder="Search patient, order or sample no.…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips">{CHIPS.map(([k, v]) => <button type="button" key={k} className={k === stage ? 'active' : ''} onClick={() => setStage(k)}>{v}</button>)}</div>
      <Loader loading={list.loading} error={list.error} reload={list.reload} />
      {list.data && (list.data.length ? (
        <div className="list">
          {list.data.map((r) => (
            <div className="row" key={r.result_id} onClick={() => navigate(`/lab/${r.result_id}`)}>
              <div className="ico blue-bg"><FlaskConical size={18} /></div>
              <div className="row-main">
                <div className="row-title">{r.test_name}</div>
                <div className="row-sub">{r.patient_name} · {r.patient_code}</div>
                <div className="row-sub">{[r.order_number, r.sample_number].filter(Boolean).join(' · ') || 'No sample yet'}{r.overdue ? ' · OVERDUE' : ''}</div>
              </div>
              <span className={`pill ${stageTone(r.stage)}`}>{STAGE[r.stage] || r.stage}</span>
            </div>
          ))}
        </div>
      ) : <div className="empty">Nothing here.</div>)}
    </SShell>
  )
}

const FLAGS = { high: 'High', low: 'Low', abnormal: 'Abnormal', critical: 'Critical' }

export function LabItem() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast, profile } = useAuth()
  const { enterResults, reviewer, lab, front, isAdmin } = useRole()
  const item = useLoad(() => rpc('get_lab_result', { p_id: id }), [id])
  const d = item.data
  const sample = useLoad(() => (d?.sample_number ? query(supabase.from('lab_samples').select('id,status').eq('sample_number', d.sample_number).maybeSingle()) : Promise.resolve(null)), [d?.sample_number])
  const report = useLoad(() => (['result_approved', 'report_released'].includes(d?.stage) ? query(supabase.from('lab_reports').select('id,status,report_number').eq('lab_result_id', id).maybeSingle()) : Promise.resolve(null)), [d?.stage, id])
  const meta = useLoad(() => (d?.stage === 'awaiting_review' ? query(supabase.from('lab_results').select('submitted_by').eq('id', id).maybeSingle()) : Promise.resolve(null)), [d?.stage, id])
  const wf = useLoad(() => query(supabase.from('app_settings').select('value').eq('key', 'lab_workflow').maybeSingle()))
  const [vals, setVals] = useState({})
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [sheet, setSheet] = useState('')
  const [s, setS] = useState({ condition: '', decision: 'accept', reason: '', recollect: false, note: '' })

  useEffect(() => {
    if (!d) return
    const v = {}
    ;(d.values || []).forEach((x) => { if (x.field_id) v[x.field_id] = x.value_text ?? String(x.value_numeric ?? '') })
    setVals(v); setComment(d.lab_comment || '')
  }, [d])

  const act = async (fn, msg) => {
    setBusy(true)
    try { await fn(); if (msg) toast(msg); setSheet(''); await item.reload(); await sample.reload(); await report.reload() } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const payload = () => (d.fields || []).map((f) => ({ field_id: f.id, value_text: (vals[f.id] || '').trim() })).filter((v) => v.value_text)
  const save = (submit) => act(() => rpc('save_result_values', { p_result: id, p_values: payload(), p_comment: comment.trim() || null, p_submit: submit }), submit ? 'Submitted for review' : 'Draft saved')

  const canEnter = enterResults && d && ['sample_accepted', 'processing'].includes(d.stage)
  const hasSample = Boolean(d?.sample_number)
  const sStatus = sample.data?.status
  // The person who entered a result cannot approve it themselves (a second pair of eyes protects patients)
  const selfBlocked = d?.stage === 'awaiting_review' && meta.data?.submitted_by === profile.id && !wf.data?.value?.allow_self_review

  return (
    <SShell title="Lab Test">
      <Loader loading={item.loading && !d} error={item.error} reload={item.reload} />
      {d && (
        <>
          <div className="card">
            <div className="row-title">{d.test_name}</div>
            <span className={`pill ${stageTone(d.stage)}`}>{STAGE[d.stage] || d.stage}</span>
            <div style={{ marginTop: 8 }}>
              <Kv k="Patient" v={`${d.patient?.full_name || '—'} (${d.patient?.patient_code || ''})`} />
              <Kv k="Age / Sex" v={[d.patient?.age, d.patient?.sex].filter(Boolean).join(' / ') || '—'} />
              <Kv k="Order" v={d.order_number || '—'} />
              <Kv k="Sample" v={d.sample_number ? `${d.sample_number} · ${d.sample_type || ''}` : 'None yet'} />
              {d.sample_status && <Kv k="Sample status" v={d.sample_status} />}
              <Kv k="Due" v={d.tat_due_at ? fmtDT(d.tat_due_at) : '—'} />
              {d.assigned_to && <Kv k="Assigned to" v={d.assigned_to} />}
            </div>
          </div>

          <div className="stack no-print">
            {!hasSample && d.stage !== 'recollection_required' && (front || lab) && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(() => rpc('staff_create_samples', { p_result_ids: [id], p_method: 'visit' }), 'Sample created')}>Create sample</button>}
            {sStatus && ['expected', 'dispatched', 'collected'].includes(sStatus) && (front || lab) && <button type="button" className="btn btn-primary" onClick={() => setSheet('receive')}>Receive sample</button>}
            {d.stage === 'sample_under_review' && sample.data && (front || lab) && <button type="button" className="btn btn-primary" onClick={() => setSheet('decide')}>Accept or reject sample</button>}
            {d.stage === 'sample_accepted' && enterResults && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => act(() => rpc('start_processing', { p_result_ids: [id] }), 'Processing started')}>Start processing</button>}
            {d.stage === 'recollection_required' && <p className="muted center">A new sample must be collected from the patient.</p>}
          </div>

          {canEnter && (d.fields || []).length > 0 && (
            <div className="card">
              <div className="card-title">Enter results</div>
              {d.fields.map((f) => (
                <div className="field" key={f.id}>
                  <label>{f.label}{f.unit ? <span className="unit"> ({f.unit})</span> : null}</label>
                  {Array.isArray(f.options) && f.options.length ? (
                    <select className="input" value={vals[f.id] || ''} onChange={(e) => setVals({ ...vals, [f.id]: e.target.value })}><option value="">—</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                  ) : (
                    <input className="input" inputMode={f.field_type === 'numeric' ? 'decimal' : undefined} value={vals[f.id] || ''} onChange={(e) => setVals({ ...vals, [f.id]: e.target.value })} />
                  )}
                </div>
              ))}
              <div className="field"><label>Lab comment</label><textarea className="input area" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
              <div className="btn-row">
                <button type="button" className="btn btn-outline" disabled={busy} onClick={() => save(false)}>Save draft</button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(true)}>Submit</button>
              </div>
              {d.review_note && <p className="err" style={{ marginTop: 8 }}>Returned: {d.review_note}</p>}
            </div>
          )}

          {!canEnter && (d.values || []).length > 0 && (
            <div className="card">
              <div className="card-title">Results</div>
              <div className="scroll-x"><table>
                <thead><tr><th>Test</th><th>Result</th><th>Reference</th></tr></thead>
                <tbody>{d.values.map((v) => (
                  <tr key={v.id}><td>{v.label}</td><td className={v.flag && v.flag !== 'normal' ? 'flagged' : ''}>{v.value_text ?? v.value_numeric}{v.unit ? ` ${v.unit}` : ''}{FLAGS[v.flag] ? ` (${FLAGS[v.flag]})` : ''}</td><td>{v.reference_text || ''}</td></tr>
                ))}</tbody>
              </table></div>
              {d.lab_comment && <p className="muted" style={{ marginTop: 8 }}>Comment: {d.lab_comment}</p>}
              {d.entered_by && <p className="muted">Entered by {d.entered_by}</p>}
            </div>
          )}

          {d.stage === 'awaiting_review' && !reviewer && <p className="muted center">Waiting for a lab reviewer to check and approve this result.</p>}
          {d.stage === 'awaiting_review' && reviewer && (selfBlocked ? (
            <div className="banner">
              <b>A different person must approve this result</b>
              <span className="muted">You entered these results, so you cannot approve or return them yourself. This second check stops unchecked results reaching patients. Ask another lab reviewer or administrator to open this test and approve it.</span>
              {isAdmin && <span className="muted">If only one person runs the lab, you can allow self-approval under More → Settings → Workflow.</span>}
            </div>
          ) : (
            <div className="btn-row no-print">
              <button type="button" className="btn btn-outline danger" onClick={() => setSheet('return')}>Return</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(() => rpc('review_result', { p_result: id, p_decision: 'approve', p_note: null }), 'Result approved')}>Approve</button>
            </div>
          ))}
          {report.data?.status === 'approved' && reviewer && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(() => rpc('release_report', { p_report: report.data.id }), 'Report released to patient')}>Release report to patient</button>}
          {report.data?.status === 'released' && <p className="muted center">Report {report.data.report_number} has been released to the patient.</p>}
          {report.data && ['approved', 'released'].includes(report.data.status) && (front || lab) && (
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/report/${report.data.id}`)}>View / print original copy</button>
          )}
        </>
      )}

      <Sheet open={sheet === 'receive'} title="Receive sample" onClose={() => setSheet('')}>
        <div className="form">
          <label>Sample condition</label><input className="input" placeholder="e.g. Good, haemolysed, leaking" value={s.condition} onChange={(e) => setS({ ...s, condition: e.target.value })} />
          <label>Decision</label>
          <select className="input" value={s.decision} onChange={(e) => setS({ ...s, decision: e.target.value })}><option value="accept">Accept</option><option value="reject">Reject</option><option value="review">Send for review</option></select>
          {s.decision === 'reject' && (<><label>Rejection reason</label><input className="input" value={s.reason} onChange={(e) => setS({ ...s, reason: e.target.value })} /><label className="check"><input type="checkbox" checked={s.recollect} onChange={(e) => setS({ ...s, recollect: e.target.checked })} /> Ask patient to give a new sample</label></>)}
          <label>Notes (optional)</label><input className="input" value={s.note} onChange={(e) => setS({ ...s, note: e.target.value })} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(() => rpc('receive_sample', { p_sample: sample.data.id, p_condition: s.condition || null, p_decision: s.decision, p_reason: s.reason || null, p_recollect: s.recollect, p_notes: s.note || null }), 'Sample received')}>Confirm</button>
        </div>
      </Sheet>
      <Sheet open={sheet === 'decide'} title="Sample decision" onClose={() => setSheet('')}>
        <div className="form">
          <label>Decision</label>
          <select className="input" value={s.decision === 'reject' ? 'reject' : 'accept'} onChange={(e) => setS({ ...s, decision: e.target.value })}><option value="accept">Accept</option><option value="reject">Reject</option></select>
          {s.decision === 'reject' && (<><label>Reason</label><input className="input" value={s.reason} onChange={(e) => setS({ ...s, reason: e.target.value })} /><label className="check"><input type="checkbox" checked={s.recollect} onChange={(e) => setS({ ...s, recollect: e.target.checked })} /> Ask patient to give a new sample</label></>)}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(() => rpc('decide_sample', { p_sample: sample.data.id, p_decision: s.decision === 'reject' ? 'reject' : 'accept', p_reason: s.reason || null, p_recollect: s.recollect }), 'Saved')}>Confirm</button>
        </div>
      </Sheet>
      <Sheet open={sheet === 'return'} title="Return for correction" onClose={() => setSheet('')}>
        <div className="form">
          <label>What needs correcting?</label><textarea className="input area" rows={3} value={s.note} onChange={(e) => setS({ ...s, note: e.target.value })} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(() => rpc('review_result', { p_result: id, p_decision: 'return', p_note: s.note.trim() }), 'Returned to lab')}>Return result</button>
        </div>
      </Sheet>
    </SShell>
  )
}
