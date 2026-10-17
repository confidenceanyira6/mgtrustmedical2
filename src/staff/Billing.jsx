import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Plus, Printer } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { useLoad, Loader, Kv, Sheet, naira, fmtDT } from '../ui'
import { SShell, PatientPicker, useRole } from './common'

const METHODS = [['cash', 'Cash'], ['transfer', 'Transfer'], ['pos', 'POS'], ['other', 'Other']]

export function Billing() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useLoad(() => rpc('outstanding_bills'))
  return (
    <SShell title="Service Billings" back={false} right={<button type="button" className="icon-btn blue" onClick={() => navigate('/billing/new')} aria-label="New bill"><Plus size={22} /></button>}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (
        <>
          <div className="card center-card"><div className="muted">Total outstanding</div><div className="price-big">{naira(data.total_outstanding)}</div></div>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/billing/new')}>New Bill</button>
          <div className="card-title">Unpaid bills</div>
          {data.bills.length ? (
            <div className="list">
              {data.bills.map((b) => (
                <div className="row" key={b.id} onClick={() => navigate(`/receipt/bill/${b.id}`)}>
                  <div className="row-main"><div className="row-title">{b.bill_code}</div><div className="row-sub">{b.patient_name || 'Walk-in'} · {fmtDT(b.billed_at)}</div></div>
                  <div className="stock-end"><b>{naira(b.balance)}</b><span className="pill warn">Due</span></div>
                </div>
              ))}
            </div>
          ) : <div className="empty">No unpaid bills.</div>}
        </>
      )}
    </SShell>
  )
}

export function NewBill() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useAuth()
  const [patient, setPatient] = useState(location.state?.patient || null)
  const [cart, setCart] = useState([])
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('cash')
  const [paidInput, setPaidInput] = useState('')
  const [busy, setBusy] = useState(false)
  const svc = useLoad(() => query(supabase.from('services').select('id,name,price,lab_category').eq('is_active', true).gt('price', 0).order('name')))

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const paid = paidInput === '' ? total : Number(paidInput)
  const matches = q.trim() ? (svc.data || []).filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 25) : []
  const add = (s) => { setCart((c) => (c.some((x) => x.id === s.id) ? c.map((x) => (x.id === s.id ? { ...x, qty: x.qty + 1 } : x)) : [...c, { id: s.id, name: s.name, price: Number(s.price), qty: 1 }])); setQ('') }
  const setQty = (id, d) => setCart((c) => c.map((x) => (x.id === id ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0))

  const submit = async () => {
    if (!cart.length) return toast('Add at least one service')
    if (!(paid >= 0) || paid > total) return toast(`Amount paid must be between 0 and ${naira(total)}`)
    setBusy(true)
    try {
      const r = await rpc('create_service_bill', { p_patient_id: patient?.id || null, p_visit_id: null, p_payment_method: method, p_items: cart.map((c) => ({ service_id: c.id, quantity: c.qty })), p_amount_paid: paid })
      navigate(`/receipt/bill/${r.id}`, { replace: true })
    } catch (e) { toast(e.message); setBusy(false) }
  }

  return (
    <SShell title="New Bill">
      <div className="card-title">Patient (optional)</div>
      <PatientPicker value={patient} onChange={setPatient} />
      <div className="card-title">Add service or test</div>
      <div className="search"><input placeholder="Search services, e.g. malaria, pregnancy…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Loader loading={svc.loading} error={svc.error} reload={svc.reload} />
      {matches.length > 0 && (
        <div className="list">{matches.map((s) => (
          <div className="row" key={s.id} onClick={() => add(s)}><div className="row-main"><div className="row-title">{s.name}</div><div className="row-sub">{s.lab_category || 'Service'}</div></div><b>{naira(s.price)}</b></div>
        ))}</div>
      )}
      {cart.length > 0 && (
        <>
          <div className="list">{cart.map((c) => (
            <div className="cart-row" key={c.id}>
              <div className="row-main"><div className="row-title">{c.name}</div><div className="row-sub">{naira(c.price)} each</div></div>
              <div className="qty"><button type="button" onClick={() => setQty(c.id, -1)}>−</button><b>{c.qty}</b><button type="button" onClick={() => setQty(c.id, 1)}>+</button></div>
            </div>
          ))}</div>
          <div className="total-bar"><span>Total</span><span>{naira(total)}</span></div>
          <div className="form">
            <label>Payment method</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <label>Amount paid now (leave blank to pay in full)</label>
            <input className="input" type="number" min="0" max={total} placeholder={String(total)} value={paidInput} onChange={(e) => setPaidInput(e.target.value)} />
            {paid < total && <p className="muted">Balance of {naira(total - paid)} will stay outstanding.</p>}
            <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Create Bill & Receipt'}</button>
          </div>
        </>
      )}
    </SShell>
  )
}

export function ReceiptView() {
  const { type, id } = useParams()
  const { toast } = useAuth()
  const { isAdmin } = useRole()
  const { data: r, loading, error, reload } = useLoad(() => rpc('get_receipt', { p_type: type, p_id: id }), [type, id])
  const [payOpen, setPayOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const act = async (fn, msg, close) => {
    setBusy(true)
    try { await fn(); toast(msg); close(false); setAmount(''); setReason(''); await reload() } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const pay = () => {
    const a = Number(amount)
    if (!(a > 0)) return toast('Enter an amount')
    return act(() => rpc('add_payment', { p_bill: id, p_amount: a, p_method: method, p_note: null }), 'Payment recorded', setPayOpen)
  }
  const doVoid = () => {
    if (!reason.trim()) return toast('Give a reason')
    return act(() => rpc(type === 'bill' ? 'void_bill' : 'void_sale', type === 'bill' ? { p_bill: id, p_reason: reason.trim() } : { p_sale: id, p_reason: reason.trim() }), 'Voided', setVoidOpen)
  }
  const isVoid = r?.status === 'void'
  return (
    <SShell title="Payment Receipt">
      <Loader loading={loading} error={error} reload={reload} />
      {r && (
        <>
          <div className="card rpt">
            <div className="center"><div className="rpt-name">M.G TRUST MEDICAL</div><div className="muted">Health • Care • Trust</div></div>
            <div className="receipt-title">{isVoid ? 'VOID — ' : ''}Payment Receipt</div>
            <Kv k="Receipt No." v={r.code} />
            <Kv k="Date" v={fmtDT(r.issued_at)} />
            <Kv k="Patient" v={r.patient?.full_name || 'Walk-in'} />
            {r.patient?.patient_code && <Kv k="Patient ID" v={r.patient.patient_code} />}
            <Kv k="Payment method" v={r.payment_method} />
            <div className="scroll-x"><table>
              <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
              <tbody>{r.items.map((i, n) => (<tr key={n}><td>{i.name}</td><td>{i.quantity}</td><td>{naira(i.unit_price)}</td><td>{naira(i.line_total)}</td></tr>))}</tbody>
            </table></div>
            <div className="total-bar"><span>Total</span><span>{naira(r.total)}</span></div>
            <Kv k="Amount paid" v={naira(r.amount_paid)} />
            <Kv k="Balance" v={naira(r.balance)} />
            {(r.payments || []).length > 1 && r.payments.map((p, n) => <Kv key={n} k={`${fmtDT(p.received_at)} · ${p.method}`} v={naira(p.amount)} />)}
            {r.void_reason && <p className="muted">Void reason: {r.void_reason}</p>}
            <p className="muted">Served by {r.served_by || '—'}</p>
            <p className="thanks">Thank you for choosing M.G TRUST MEDICAL</p>
          </div>
          <div className="no-print stack">
            <button type="button" className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</button>
            {type === 'bill' && !isVoid && Number(r.balance) > 0 && <button type="button" className="btn btn-outline" onClick={() => { setAmount(String(r.balance)); setPayOpen(true) }}>Add Payment</button>}
            {isAdmin && !isVoid && <button type="button" className="btn btn-outline danger" onClick={() => setVoidOpen(true)}>Void {type === 'bill' ? 'bill' : 'sale'}</button>}
          </div>
        </>
      )}
      <Sheet open={payOpen} title="Add payment" onClose={() => setPayOpen(false)}>
        <div className="form">
          <label>Amount (₦)</label><input className="input" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <label>Method</label><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={pay}>Record payment</button>
        </div>
      </Sheet>
      <Sheet open={voidOpen} title="Void" onClose={() => setVoidOpen(false)}>
        <div className="form">
          <p className="muted">This cancels the record and cannot be undone.</p>
          <label>Reason</label><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" className="btn btn-primary danger-bg" disabled={busy} onClick={doVoid}>Void</button>
        </div>
      </Sheet>
    </SShell>
  )
}
