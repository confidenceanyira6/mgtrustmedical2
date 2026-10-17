import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { useAuth } from '../auth'
import { rpc } from '../supabase'
import { Shell, useLoad, Loader, Kv, Segmented, Sheet, fmtDate, patientNav } from '../ui'

export function MyResults() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useLoad(() => rpc('get_my_tests'))
  const [tab, setTab] = useState('Reports')
  const list = (data || []).filter((t) => (tab === 'Reports' ? t.report_id : !t.report_id))
  return (
    <Shell title="My Results" back={false} nav={patientNav}>
      <Segmented options={['Reports', 'In Progress']} value={tab} onChange={setTab} />
      <Loader loading={loading} error={error} reload={reload} />
      {data && (list.length ? (
        <div className="list">
          {list.map((t) => (
            <div className="row" key={t.result_id} onClick={() => t.report_id && navigate(`/results/${t.report_id}`)}>
              <div className="ico blue-bg"><FlaskConical size={18} /></div>
              <div className="row-main">
                <div className="row-title">{t.test_name}</div>
                <div className="row-sub">{[t.order_number, t.sample_number].filter(Boolean).join(' · ')}</div>
                <div className="row-sub">{t.report_id ? `Released ${fmtDate(t.report_released_at)}` : t.status}</div>
              </div>
              {t.report_id && <span className="btn-view">View</span>}
            </div>
          ))}
        </div>
      ) : <div className="empty">{tab === 'Reports' ? 'No reports released yet.' : 'No tests in progress.'}</div>)}
    </Shell>
  )
}

const FLAG = { high: 'High', low: 'Low', abnormal: 'Abnormal', critical: 'Critical' }

export function ReportView() {
  const { id } = useParams()
  const { toast } = useAuth()
  const { data, loading, error, reload } = useLoad(() => rpc('get_my_report', { p_report: id }), [id])
  const reports = useLoad(() => rpc('get_my_reports'), [id])
  const req = (reports.data || []).find((r) => r.id === id)?.original_request
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const c = data?.content

  const download = () => {
    rpc('record_report_download', { p_report: id }).catch(() => {})
    window.print()
  }
  const request = async () => {
    setBusy(true)
    try { await rpc('request_original_report', { p_report: id, p_note: note.trim() || null }); toast('Request submitted'); setOpen(false); setNote(''); reports.reload() } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const cancelReq = async () => {
    try { await rpc('cancel_original_request', { p_id: req.id }); toast('Request cancelled'); reports.reload() } catch (e) { toast(e.message) }
  }
  const contact = c?.centre ? [c.centre.address, c.centre.phone, c.centre.email].filter((x) => typeof x === 'string' && x) : []

  return (
    <Shell title="Laboratory Report" nav={patientNav}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && c && (
        <>
          <div className="card rpt">
            <div className="center"><div className="rpt-name">{c.centre?.name || 'M.G TRUST MEDICAL'}</div>{contact.map((x) => <div key={x} className="muted">{x}</div>)}</div>
            <div className="receipt-title">Laboratory Report</div>
            <Kv k="Patient" v={c.patient?.full_name} />
            <Kv k="Patient ID" v={c.patient?.patient_code} />
            <Kv k="Age / Sex" v={[c.patient?.age, c.patient?.sex].filter(Boolean).join(' / ') || '—'} />
            <Kv k="Test" v={c.test?.name} />
            <Kv k="Order No." v={c.order_number || '—'} />
            <Kv k="Sample" v={[c.sample?.sample_number, c.sample?.sample_type].filter(Boolean).join(' · ') || '—'} />
            <Kv k="Collected" v={fmtDate(c.sample?.collected_at)} />
            <Kv k="Report Date" v={fmtDate(data.released_at)} />
            <Kv k="Report No." v={data.report_number} />
            <div className="scroll-x">
              <table>
                <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th></tr></thead>
                <tbody>
                  {(c.values || []).map((v, i) => (
                    <tr key={i}>
                      <td>{v.label}</td>
                      <td className={v.flag && v.flag !== 'normal' ? 'flagged' : ''}>{v.value_text ?? v.value_numeric ?? '—'}{v.flag && FLAG[v.flag] ? ` (${FLAG[v.flag]})` : ''}</td>
                      <td>{v.unit || ''}</td>
                      <td>{v.reference || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {c.lab_comment && <p className="muted" style={{ marginTop: 10 }}><b>Comment:</b> {c.lab_comment}</p>}
            {c.reviewer?.name && <p className="muted">Approved by {c.reviewer.name}{c.reviewer.title ? `, ${c.reviewer.title}` : ''}{c.reviewer.registration_number ? ` (${c.reviewer.registration_number})` : ''}</p>}
            <p className="muted">Verification code: <b>{data.verification_code}</b></p>
            {c.footer_text && <p className="thanks">{c.footer_text}</p>}
          </div>

          <div className="no-print stack">
            <button type="button" className="btn btn-primary" onClick={download}>Download PDF / Print</button>
            {req ? (
              <div className="card">
                <div className="card-title">Original report request</div>
                <Kv k="Reference" v={req.collection_reference} />
                <Kv k="Status" v={String(req.status).replace(/_/g, ' ')} />
                {req.estimated_collection_date && <Kv k="Estimated collection" v={fmtDate(req.estimated_collection_date)} />}
                {['submitted', 'preparing'].includes(req.status) && <button type="button" className="link-btn" onClick={cancelReq}>Cancel request</button>}
              </div>
            ) : (
              <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>Request Original Report</button>
            )}
          </div>
        </>
      )}
      <Sheet open={open} title="Request original report" onClose={() => setOpen(false)}>
        <div className="form">
          <p className="muted">The centre will prepare a signed hard copy for you to collect. You'll be notified when it's ready.</p>
          <label>Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={request}>Submit request</button>
        </div>
      </Sheet>
    </Shell>
  )
}
