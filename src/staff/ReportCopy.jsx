import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useAuth } from '../auth'
import { rpc } from '../supabase'
import { useLoad, Loader, Kv, fmtDate, fmtDT } from '../ui'
import { SShell } from './common'

const FLAG = { high: 'High', low: 'Low', abnormal: 'Abnormal', critical: 'Critical' }

// The exact report that was approved. It is read from the stored copy, never rebuilt, so what is printed is the original.
export function ReportCopy() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data, loading, error, reload } = useLoad(() => rpc('staff_get_report', { p_report: id }), [id])
  const c = data?.content
  const contact = c?.centre ? [c.centre.address, c.centre.phone, c.centre.email].filter((x) => typeof x === 'string' && x) : []
  const print = () => { rpc('staff_get_report', { p_report: id, p_print: true }).catch(() => {}); window.print() }
  return (
    <SShell title="Original Report Copy">
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
            <Kv k="Approved" v={fmtDate(data.approved_at)} />
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
            {c.signature?.configured && c.signature.signatory_name && <p className="muted">Signed: {c.signature.signatory_name}{c.signature.signatory_title ? `, ${c.signature.signatory_title}` : ''}</p>}
            <p className="muted">Verification code: <b>{data.verification_code}</b></p>
            {c.footer_text && <p className="thanks">{c.footer_text}</p>}
            <p className="muted center" style={{ marginTop: 12 }}>Exact copy of the report approved on {fmtDate(data.approved_at)}. Printed {fmtDT(new Date().toISOString())} by {profile.full_name || profile.email}.</p>
          </div>
          {data.status === 'approved' && <p className="muted center no-print">This report has been approved but not yet released to the patient.</p>}
          <div className="no-print stack">
            <button type="button" className="btn btn-primary" onClick={print}><Printer size={16} /> Print / Save as PDF</button>
          </div>
        </>
      )}
    </SShell>
  )
}
