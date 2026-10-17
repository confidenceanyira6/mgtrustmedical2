import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquare, Plus } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { Shell, useLoad, Loader, Sheet, fmtDT, patientNav } from '../ui'

const TOPICS = [['appointment', 'Appointment'], ['sample_submission', 'Sample submission'], ['report_collection', 'Report collection'], ['billing', 'Billing'], ['other', 'General inquiry']]
const topicLabel = (t) => (TOPICS.find(([k]) => k === t) || [0, 'Message'])[1]

export function Messages() {
  const navigate = useNavigate()
  const { toast } = useAuth()
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('message_threads').select('id,subject,topic,status,last_message_at').order('last_message_at', { ascending: false })))
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('other')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!subject.trim() || !body.trim()) return toast('Add a subject and a message')
    setBusy(true)
    try {
      const id = await rpc('patient_send_message', { p_thread: null, p_subject: subject, p_topic: topic, p_body: body.trim() })
      setOpen(false); setSubject(''); setBody('')
      navigate(`/messages/${id}`)
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }

  return (
    <Shell title="Messages" back={false} nav={patientNav} right={<button type="button" className="icon-btn blue" onClick={() => setOpen(true)} aria-label="New message"><Plus size={22} /></button>}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (data.length ? (
        <div className="list">
          {data.map((t) => (
            <div className="row" key={t.id} onClick={() => navigate(`/messages/${t.id}`)}>
              <div className="ico blue-bg"><MessageSquare size={18} /></div>
              <div className="row-main">
                <div className="row-title">{t.subject}</div>
                <div className="row-sub">{topicLabel(t.topic)}{t.status === 'closed' ? ' · Closed' : ''}</div>
              </div>
              <span className="row-sub">{fmtDT(t.last_message_at)}</span>
            </div>
          ))}
        </div>
      ) : <div className="empty">No messages yet. Tap + to contact the centre.</div>)}
      <Sheet open={open} title="New message" onClose={() => setOpen(false)}>
        <div className="form">
          <label>Topic</label>
          <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>{TOPICS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <label>Subject</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <label>Message</label>
          <textarea className="input area" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={send}>Send</button>
        </div>
      </Sheet>
    </Shell>
  )
}

export function Thread() {
  const { id } = useParams()
  const { toast } = useAuth()
  const thread = useLoad(() => query(supabase.from('message_threads').select('id,subject,topic,status').eq('id', id).maybeSingle()), [id])
  const msgs = useLoad(() => query(supabase.from('messages').select('id,sender_type,body,created_at').eq('thread_id', id).order('created_at', { ascending: true })), [id])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { rpc('mark_thread_read', { p_thread: id }).catch(() => {}) }, [id])
  useEffect(() => {
    const t = setInterval(() => msgs.reload(), 15000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const send = async () => {
    if (!body.trim()) return
    setBusy(true)
    try { await rpc('patient_send_message', { p_thread: id, p_subject: null, p_topic: null, p_body: body.trim() }); setBody(''); await msgs.reload() } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const closed = thread.data?.status === 'closed'
  return (
    <Shell title={thread.data?.subject || 'Conversation'} nav={patientNav}>
      <Loader loading={msgs.loading && !msgs.data} error={msgs.error} reload={msgs.reload} />
      <div className="chat">
        {(msgs.data || []).map((m) => (
          <div key={m.id} className={`bubble ${m.sender_type === 'patient' ? 'me' : ''}`}>
            <div>{m.body}</div>
            <small>{m.sender_type === 'staff' ? 'M.G Trust Medical · ' : ''}{fmtDT(m.created_at)}</small>
          </div>
        ))}
      </div>
      {closed ? <p className="muted center">This conversation is closed.</p> : (
        <div className="composer">
          <input className="input" placeholder="Type a message…" value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button type="button" className="btn btn-primary send" disabled={busy} onClick={send}>Send</button>
        </div>
      )}
    </Shell>
  )
}
