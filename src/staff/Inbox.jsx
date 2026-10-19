import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { useLoad, Loader, Kv, Sheet, Segmented, fmtDT, fmtDate } from '../ui'
import { SShell } from './common'

export function Inbox() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('Open')
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('message_threads').select('id,subject,topic,status,last_message_at,patients(full_name,patient_code)').order('last_message_at', { ascending: false }).limit(100)))
  const list = (data || []).filter((t) => (tab === 'Open' ? t.status !== 'closed' : t.status === 'closed'))
  return (
    <SShell title="Messages" back={false}>
      <Segmented options={['Open', 'Closed']} value={tab} onChange={setTab} />
      <Loader loading={loading} error={error} reload={reload} />
      {data && (list.length ? (
        <div className="list">
          {list.map((t) => (
            <div className="row" key={t.id} onClick={() => navigate(`/messages/${t.id}`)}>
              <div className="ico blue-bg"><MessageSquare size={18} /></div>
              <div className="row-main"><div className="row-title">{t.subject}</div><div className="row-sub">{t.patients?.full_name || 'Patient'} · {t.topic}</div></div>
              <span className="row-sub">{fmtDate(t.last_message_at)}</span>
            </div>
          ))}
        </div>
      ) : <div className="empty">No {tab.toLowerCase()} conversations.</div>)}
    </SShell>
  )
}

export function StaffThread() {
  const { id } = useParams()
  const { toast } = useAuth()
  const thread = useLoad(() => query(supabase.from('message_threads').select('id,subject,status,patients(full_name,patient_code)').eq('id', id).maybeSingle()), [id])
  const msgs = useLoad(() => query(supabase.from('messages').select('id,sender_type,body,created_at').eq('thread_id', id).order('created_at', { ascending: true })), [id])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    if (!body.trim()) return
    setBusy(true)
    try { await rpc('staff_reply_message', { p_thread: id, p_body: body.trim() }); setBody(''); await msgs.reload() } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  return (
    <SShell title={thread.data?.patients?.full_name || 'Conversation'}>
      {thread.data && <p className="muted">{thread.data.subject}</p>}
      <Loader loading={msgs.loading && !msgs.data} error={msgs.error} reload={msgs.reload} />
      <div className="chat">
        {(msgs.data || []).map((m) => (
          <div key={m.id} className={`bubble ${m.sender_type === 'staff' ? 'me' : ''}`}><div>{m.body}</div><small>{m.sender_type === 'system' ? 'System · ' : ''}{fmtDT(m.created_at)}</small></div>
        ))}
      </div>
      <div className="composer">
        <input className="input" placeholder="Reply to patient…" value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button type="button" className="btn btn-primary send" disabled={busy} onClick={send}>Send</button>
      </div>
    </SShell>
  )
}

export function Originals() {
  const navigate = useNavigate()
  const { toast } = useAuth()
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('original_report_requests').select('id,report_id,collection_reference,status,patient_note,staff_note,estimated_collection_date,requested_at,patients(full_name,patient_code)').order('requested_at', { ascending: false }).limit(100)))
  const [sel, setSel] = useState(null)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [who, setWho] = useState('')
  const [busy, setBusy] = useState(false)
  const close = () => { setSel(null); setDate(''); setNote(''); setWho('') }
  const act = async (fn, msg) => { setBusy(true); try { await fn(); toast(msg); close(); await reload() } catch (e) { toast(e.message) } finally { setBusy(false) } }
  const upd = (status) => act(() => rpc('staff_update_original_request', { p_id: sel.id, p_status: status, p_estimated_date: date || null, p_note: note.trim() || null }), 'Updated')
  return (
    <SShell title="Original Report Requests" back={false}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (data.length ? (
        <div className="list">
          {data.map((r) => (
            <div className="row" key={r.id} onClick={() => setSel(r)}>
              <div className="row-main"><div className="row-title">{r.collection_reference}</div><div className="row-sub">{r.patients?.full_name} · {fmtDate(r.requested_at)}</div></div>
              <span className={`pill ${r.status === 'collected' ? 'ok' : r.status === 'cancelled' ? 'bad' : 'warn'}`}>{String(r.status).replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      ) : <div className="empty">No requests.</div>)}
      <Sheet open={!!sel} title={sel?.collection_reference || ''} onClose={close}>
        {sel && (
          <div className="form">
            <Kv k="Patient" v={`${sel.patients?.full_name || ''} (${sel.patients?.patient_code || ''})`} />
            <Kv k="Status" v={String(sel.status).replace(/_/g, ' ')} />
            {sel.patient_note && <Kv k="Patient note" v={sel.patient_note} />}
            {sel.estimated_collection_date && <Kv k="Estimated" v={fmtDate(sel.estimated_collection_date)} />}
            {sel.report_id && sel.status !== 'cancelled' && <button type="button" className="btn btn-outline" onClick={() => navigate(`/report/${sel.report_id}`)}>Open exact original copy to print</button>}
            {['submitted', 'preparing'].includes(sel.status) && (<>
              <label>Estimated collection date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <label>Note to patient (optional)</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
              {sel.status === 'submitted' && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => upd('preparing')}>Start preparing</button>}
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => upd('ready')}>Mark ready for collection</button>
            </>)}
            {sel.status === 'ready' && (<>
              <label>Collected by (name)</label><input className="input" value={who} onChange={(e) => setWho(e.target.value)} />
              <button type="button" className="btn btn-primary" disabled={busy || !who.trim()} onClick={() => act(() => rpc('confirm_original_collected', { p_id: sel.id, p_collected_by_name: who.trim(), p_note: null }), 'Marked as collected')}>Confirm collected</button>
            </>)}
          </div>
        )}
      </Sheet>
    </SShell>
  )
}
