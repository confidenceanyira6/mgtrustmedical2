import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../auth'
import { supabase, rpc, query } from '../supabase'
import { useLoad, Loader, Sheet, naira } from '../ui'
import { SShell, PatientPicker, useRole } from './common'

const METHODS = [['cash', 'Cash'], ['transfer', 'Transfer'], ['pos', 'POS'], ['other', 'Other']]
const loadProducts = () => query(supabase.from('products').select('id,name,sku,selling_price,quantity_in_stock,reorder_level,is_active').order('name'))

export function Sales() {
  const navigate = useNavigate()
  const { toast } = useAuth()
  const { data, loading, error, reload } = useLoad(loadProducts)
  const [q, setQ] = useState('')
  const [cart, setCart] = useState({})
  const [patient, setPatient] = useState(null)
  const [method, setMethod] = useState('cash')
  const [busy, setBusy] = useState(false)

  const products = (data || []).filter((p) => p.is_active)
  const list = products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
  const lines = products.filter((p) => cart[p.id])
  const total = lines.reduce((s, p) => s + Number(p.selling_price) * cart[p.id], 0)
  const change = (p, d) => setCart((c) => {
    const n = Math.max(0, Math.min(p.quantity_in_stock, (c[p.id] || 0) + d))
    const next = { ...c }
    if (n) next[p.id] = n; else delete next[p.id]
    return next
  })
  const complete = async () => {
    if (!lines.length) return toast('Add at least one product')
    setBusy(true)
    try {
      const r = await rpc('create_product_sale', { p_patient_id: patient?.id || null, p_payment_method: method, p_items: lines.map((p) => ({ product_id: p.id, quantity: cart[p.id] })) })
      navigate(`/receipt/sale/${r.id}`, { replace: true })
    } catch (e) { toast(e.message); setBusy(false) }
  }
  return (
    <SShell title="New Sale" back={false} right={<button type="button" className="link-btn" onClick={() => navigate('/products')}>Products</button>}>
      <div className="search"><input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (list.length ? (
        <div className="list">
          {list.map((p) => (
            <div className="cart-row" key={p.id}>
              <div className="row-main"><div className="row-title">{p.name}</div><div className="row-sub">{naira(p.selling_price)} · {p.quantity_in_stock} in stock</div></div>
              <div className="qty"><button type="button" onClick={() => change(p, -1)}>−</button><b>{cart[p.id] || 0}</b><button type="button" disabled={p.quantity_in_stock <= (cart[p.id] || 0)} onClick={() => change(p, 1)}>+</button></div>
            </div>
          ))}
        </div>
      ) : <div className="empty">{products.length ? 'No matching products.' : 'No products yet. Add them under Products.'}</div>)}
      {lines.length > 0 && (
        <>
          <div className="total-bar"><span>Total</span><span>{naira(total)}</span></div>
          <div className="card-title">Customer (optional)</div>
          <PatientPicker value={patient} onChange={setPatient} />
          <div className="form">
            <label>Payment method</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={complete}>{busy ? 'Saving…' : 'Complete Sale'}</button>
          </div>
        </>
      )}
    </SShell>
  )
}

export function Products() {
  const { toast } = useAuth()
  const { isAdmin } = useRole()
  const { data, loading, error, reload } = useLoad(loadProducts)
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ name: '', sku: '', price: '', qty: '', reorder: '5' })
  const [stock, setStock] = useState(null)
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn, msg, close) => {
    setBusy(true)
    try { await fn(); toast(msg); close(); await reload() } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const create = () => {
    if (!f.name.trim() || !(Number(f.price) > 0)) return toast('Enter a name and a price')
    return run(async () => {
      const p = await query(supabase.from('products').insert({ name: f.name.trim(), sku: f.sku.trim() || null, selling_price: Number(f.price), quantity_in_stock: 0, reorder_level: Number(f.reorder) || 0 }).select('id').single())
      if (Number(f.qty) > 0) await rpc('restock_product', { p_product: p.id, p_qty: Number(f.qty), p_note: 'Opening stock' })
    }, 'Product added', () => { setAdd(false); setF({ name: '', sku: '', price: '', qty: '', reorder: '5' }) })
  }
  const restock = () => {
    const n = Number(qty)
    const np = price === '' ? null : Number(price)
    if (!(n > 0) && np === null) return toast('Enter a quantity or a new price')
    return run(async () => {
      if (n > 0) await rpc('restock_product', { p_product: stock.id, p_qty: n, p_note: null })
      if (np !== null) await query(supabase.from('products').update({ selling_price: np }).eq('id', stock.id))
    }, 'Updated', () => setStock(null))
  }
  return (
    <SShell title="Products & Inventory" back={false} right={isAdmin && <button type="button" className="icon-btn blue" onClick={() => setAdd(true)} aria-label="Add product"><Plus size={22} /></button>}>
      <Loader loading={loading} error={error} reload={reload} />
      {data && (data.length ? (
        <div className="list">
          {data.map((p) => (
            <div className="row" key={p.id} onClick={() => isAdmin && (setStock(p), setQty(''), setPrice(''))}>
              <div className="row-main"><div className="row-title">{p.name}</div><div className="row-sub">{naira(p.selling_price)}{p.sku ? ` · ${p.sku}` : ''}</div></div>
              <div className="stock-end"><b>{p.quantity_in_stock}</b>{p.quantity_in_stock <= p.reorder_level && <span className="badge warn">Low stock</span>}</div>
            </div>
          ))}
        </div>
      ) : <div className="empty">No products yet.{isAdmin ? ' Tap + to add one.' : ''}</div>)}
      {isAdmin && data?.length > 0 && <p className="muted center">Tap a product to restock or change its price.</p>}
      <Sheet open={add} title="Add product" onClose={() => setAdd(false)}>
        <div className="form">
          <label>Name</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <label>SKU / code (optional)</label><input className="input" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
          <label>Selling price (₦)</label><input className="input" type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <label>Opening stock</label><input className="input" type="number" min="0" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
          <label>Low-stock alert level</label><input className="input" type="number" min="0" value={f.reorder} onChange={(e) => setF({ ...f, reorder: e.target.value })} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={create}>Add product</button>
        </div>
      </Sheet>
      <Sheet open={!!stock} title={stock?.name || ''} onClose={() => setStock(null)}>
        <div className="form">
          <label>Add stock (quantity received)</label><input className="input" type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
          <label>New selling price (₦, optional)</label><input className="input" type="number" min="0" placeholder={stock ? String(stock.selling_price) : ''} value={price} onChange={(e) => setPrice(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={restock}>Save</button>
        </div>
      </Sheet>
    </SShell>
  )
}
