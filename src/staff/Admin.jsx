import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, query } from '../supabase'
import { useLoad, Loader, Sheet, naira, fmtDT, fmtDate, todayLagos } from '../ui'
import { SShell, ROLES } from './common'

export function Users() {
  const { profile, toast } = useAuth()
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('staff_profiles').select('id,full_name,email,role,is_active,branch_id,created_at').order('created_at')))
  const branches = useLoad(() => query(supabase.from('branches').select('id,name').order('name')))
  const upd = async (id, patch, msg) => { try { await query(supabase.from('staff_profiles').update(patch).eq('id', id)); toast(msg); reload() } catch (e) { toast(e.message) } }
  return (
    <SShell title="User Management" back={false}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (
        <div className="list">
          {data.map((u) => {
            const me = u.id === profile.id
            return (
              <div className="cart-row" key={u.id} style={{ flexWrap: 'wrap' }}>
                <div className="row-main"><div className="row-title">{u.full_name || u.email}{me ? ' (you)' : ''}</div><div className="row-sub">{u.email}</div></div>
                <span className={`pill ${u.is_active ? 'ok' : 'warn'}`}>{u.is_active ? 'Active' : 'Pending'}</span>
                <select className="input" style={{ height: 36, maxWidth: 150 }} value={u.role} disabled={me} onChange={(e) => upd(u.id, { role: e.target.value }, 'Role updated')}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <select className="input" style={{ height: 36, maxWidth: 150 }} value={u.branch_id || ''} onChange={(e) => upd(u.id, { branch_id: e.target.value || null }, 'Branch updated')}><option value="">All branches</option>{(branches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                {!me && <button type="button" className="btn-view" onClick={() => upd(u.id, { is_active: !u.is_active }, u.is_active ? 'Deactivated' : 'Activated')}>{u.is_active ? 'Deactivate' : 'Activate'}</button>}
              </div>
            )
          })}
        </div>
      )}
      <p className="muted">To add a staff member, create their login in Supabase (Authentication → Users → Add user), then activate them here, choose their role and assign their branch.</p>
    </SShell>
  )
}

export function Audit() {
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('audit_log').select('id,at,user_id,action,entity,entity_id').order('at', { ascending: false }).limit(100)))
  const staff = useLoad(() => query(supabase.from('staff_profiles').select('id,full_name,email')))
  const name = (id) => { const s = (staff.data || []).find((x) => x.id === id); return s ? (s.full_name || s.email) : id ? 'Patient / system' : 'System' }
  return (
    <SShell title="Audit Logs" back={false}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (data.length ? (
        <div className="list mini-list">
          {data.map((a) => (
            <div className="row" key={a.id}><div className="row-main"><div className="row-title">{a.action} · {a.entity}</div><div className="row-sub">{name(a.user_id)} · {fmtDT(a.at)}</div></div></div>
          ))}
        </div>
      ) : <div className="empty">No activity logged yet.</div>)}
    </SShell>
  )
}

export function Expenses() {
  const { profile, toast } = useAuth()
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('expenses').select('id,expense_date,category,description,amount').order('expense_date', { ascending: false }).limit(100)))
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ date: todayLagos(), category: '', description: '', amount: '' })
  const save = async () => {
    if (!f.category.trim() || !(Number(f.amount) > 0)) return toast('Enter a category and an amount')
    try {
      await query(supabase.from('expenses').insert({ expense_date: f.date, category: f.category.trim(), description: f.description.trim() || null, amount: Number(f.amount), recorded_by: profile.id }))
      toast('Expense recorded'); setOpen(false); setF({ date: todayLagos(), category: '', description: '', amount: '' }); reload()
    } catch (e) { toast(e.message) }
  }
  const total = (data || []).reduce((s, e) => s + Number(e.amount), 0)
  return (
    <SShell title="Expenses" back={false} right={<button type="button" className="icon-btn blue" onClick={() => setOpen(true)} aria-label="Add expense"><Plus size={22} /></button>}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (<>
        <div className="card center-card"><div className="muted">Recent expenses</div><div className="price-big">{naira(total)}</div></div>
        {data.length ? (
          <div className="list">{data.map((e) => (
            <div className="row" key={e.id}><div className="row-main"><div className="row-title">{e.category}</div><div className="row-sub">{fmtDate(e.expense_date)}{e.description ? ` · ${e.description}` : ''}</div></div><b>{naira(e.amount)}</b></div>
          ))}</div>
        ) : <div className="empty">No expenses recorded.</div>}
      </>)}
      <Sheet open={open} title="Record expense" onClose={() => setOpen(false)}>
        <div className="form">
          <label>Date</label><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <label>Category</label><input className="input" placeholder="e.g. Reagents, Rent, Salaries" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <label>Description (optional)</label><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <label>Amount (₦)</label><input className="input" type="number" min="0" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <button type="button" className="btn btn-primary" onClick={save}>Save expense</button>
        </div>
      </Sheet>
    </SShell>
  )
}

const KEYS = ['name', 'phone', 'email', 'address']

export function SettingsPage() {
  const { toast } = useAuth()
  const { data, loading, error, reload } = useLoad(() => query(supabase.from('app_settings').select('key,value')))
  const get = (k) => (data || []).find((r) => r.key === k)?.value || {}
  const [contact, setContact] = useState(null)
  const [tpl, setTpl] = useState(null)
  const c = contact || get('centre_contact')
  const t = tpl || get('report_template')
  const set = async (key, value, msg) => { try { await query(supabase.from('app_settings').update({ value }).eq('key', key)); toast(msg); setContact(null); setTpl(null); reload() } catch (e) { toast(e.message) } }
  const pol = get('appointment_policy')
  const wf = get('lab_workflow')
  return (
    <SShell title="Settings" back={false}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (<>
        <div className="card form">
          <div className="card-title">Medical centre information</div>
          {KEYS.map((k) => (<div key={k}><label style={{ textTransform: 'capitalize' }}>{k}</label><input className="input" value={c[k] || ''} onChange={(e) => setContact({ ...c, [k]: e.target.value })} /></div>))}
          <button type="button" className="btn btn-primary" onClick={() => set('centre_contact', { ...get('centre_contact'), ...c }, 'Saved')}>Save</button>
        </div>
        <div className="card form">
          <div className="card-title">Report template</div>
          <label>Signatory name</label><input className="input" value={t.signatory_name || ''} onChange={(e) => setTpl({ ...t, signatory_name: e.target.value })} />
          <label>Signatory title</label><input className="input" value={t.signatory_title || ''} onChange={(e) => setTpl({ ...t, signatory_title: e.target.value })} />
          <label>Report footer text</label><input className="input" value={t.footer_text || ''} onChange={(e) => setTpl({ ...t, footer_text: e.target.value })} />
          <button type="button" className="btn btn-primary" onClick={() => set('report_template', { ...get('report_template'), ...t }, 'Saved')}>Save</button>
        </div>
        <div className="card form">
          <div className="card-title">Workflow</div>
          <label className="check"><input type="checkbox" checked={Boolean(pol.auto_confirm)} onChange={(e) => set('appointment_policy', { ...pol, auto_confirm: e.target.checked }, 'Saved')} /> Confirm patient bookings automatically</label>
          <label className="check"><input type="checkbox" checked={Boolean(wf.allow_self_review)} onChange={(e) => set('lab_workflow', { ...wf, allow_self_review: e.target.checked }, 'Saved')} /> Allow a reviewer to approve results they entered</label>
        </div>
      </>)}
    </SShell>
  )
}
