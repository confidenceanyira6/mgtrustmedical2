import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, FileText, FlaskConical, MessageSquare, TestTube } from 'lucide-react'
import { useAuth } from '../auth'
import { rpc } from '../supabase'
import { Shell, useLoad, fmtDT, patientNav, LogoMark } from '../ui'

const ACTIVE = ['pending_confirmation', 'confirmed', 'rescheduled', 'checked_in']

export default function PatientHome() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const appts = useLoad(() => rpc('get_my_appointments'))
  const tests = useLoad(() => rpc('get_my_tests'))

  const hour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Lagos' }))
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const first = (profile?.full_name || '').split(' ')[0]

  const next = (appts.data || [])
    .filter((a) => ACTIVE.includes(a.status) && a.slot_start && new Date(a.slot_start) > new Date())
    .sort((a, b) => new Date(a.slot_start) - new Date(b.slot_start))[0]
  const pending = (tests.data || []).filter((t) => !t.report_id).length
  const ready = (tests.data || []).filter((t) => t.report_id).length

  const quick = [
    { label: 'Book a Test', Icon: FlaskConical, to: '/services' },
    { label: 'My Appointments', Icon: CalendarDays, to: '/appointments' },
    { label: 'My Results', Icon: FileText, to: '/results' },
    { label: 'Messages', Icon: MessageSquare, to: '/messages' },
  ]

  const header = (
    <header className="topbar home-top">
      <LogoMark size={30} />
      <div style={{ flex: 1 }}>
        <div className="greet">{greet}, {first}</div>
        <div className="muted">Patient ID: {profile?.patient_code}</div>
      </div>
      <button type="button" className="icon-btn blue" onClick={() => navigate('/notifications')} aria-label="Notifications"><Bell size={20} /></button>
    </header>
  )

  return (
    <Shell header={header} nav={patientNav}>
      <div className="info-cards">
        <div className="card info" onClick={() => navigate('/appointments')}>
          <CalendarDays size={20} className="blue" />
          <div><div className="row-title">Upcoming Appointment</div>
            <div className="row-sub">{appts.loading ? 'Loading…' : next ? `${fmtDT(next.slot_start)} · ${next.reference}` : 'No upcoming appointments'}</div></div>
        </div>
        <div className="card info" onClick={() => navigate('/results')}>
          <TestTube size={20} className="blue" />
          <div><div className="row-title">Pending Tests</div>
            <div className="row-sub">{tests.loading ? 'Loading…' : `${pending} ${pending === 1 ? 'test' : 'tests'}`}</div></div>
        </div>
        <div className="card info" onClick={() => navigate('/results')}>
          <FileText size={20} className="blue" />
          <div><div className="row-title">Reports Ready</div>
            <div className="row-sub">{tests.loading ? 'Loading…' : `${ready} ${ready === 1 ? 'report' : 'reports'}`}</div></div>
        </div>
      </div>
      <div className="card-title" style={{ marginTop: 6 }}>Quick Actions</div>
      <div className="quick four">
        {quick.map(({ label, Icon, to }) => (
          <button type="button" key={label} onClick={() => navigate(to)}><span><Icon size={20} /></span>{label}</button>
        ))}
      </div>
    </Shell>
  )
}
