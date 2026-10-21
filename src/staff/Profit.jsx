import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { rpc } from '../supabase'
import { useLoad, Loader, Segmented, Kv, naira, fmtDate, todayLagos } from '../ui'
import { SShell } from './common'

const money = (n) => (Number(n) < 0 ? '-' : '') + naira(Math.abs(Number(n) || 0))
const tone = (n) => ({ color: n > 0 ? '#067647' : n < 0 ? '#b42318' : undefined })
const resultLabel = (r) => (r === 'profit' ? 'Profit' : r === 'loss' ? 'Loss' : 'Break-even')
const resultClass = (r) => (r === 'profit' ? 'ok' : r === 'loss' ? 'bad' : 'info')
const monthStart = () => `${todayLagos().slice(0, 8)}01`
const monthsAgo = (n) => {
  const [y, m] = todayLagos().slice(0, 7).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 10)
}
const monthLabel = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function downloadCsv(name, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function PLCard({ title, r }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="center" style={{ margin: '6px 0 12px' }}>
        <div style={{ fontSize: 28, fontWeight: 700, ...tone(r.net_profit) }}>{money(r.net_profit)}</div>
        <span className={`pill ${resultClass(r.result)}`}>{resultLabel(r.result)}</span>
      </div>
      <Kv k="Selling price total" v={naira(r.total_revenue)} />
      <Kv k="Buying price total" v={naira(r.total_cost)} />
      <Kv k="Profit (selling − buying)" v={money(r.net_profit)} />
    </div>
  )
}

export function Profit() {
  const [view, setView] = useState('Daily')
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayLagos())
  const sum = useLoad(() => rpc('profit_summary'), [])
  const rows = useLoad(() => (view === 'Daily'
    ? rpc('profit_loss_daily', { p_from: from, p_to: to })
    : rpc('profit_loss_monthly', { p_from: monthsAgo(11), p_to: todayLagos() })), [view, from, to])
  const list = [...(rows.data || [])].reverse()
  const label = (r) => (view === 'Daily' ? fmtDate(`${r.from}T12:00:00Z`) : monthLabel(r.from))
  const totals = list.reduce((t, r) => ({
    total_revenue: t.total_revenue + Number(r.total_revenue),
    total_cost: t.total_cost + Number(r.total_cost),
    net_profit: t.net_profit + Number(r.net_profit),
  }), { total_revenue: 0, total_cost: 0, net_profit: 0 })
  return (
    <SShell title="Profit & Loss">
      <Loader loading={sum.loading} error={sum.error} reload={sum.reload} />
      {sum.data && (
        <>
          <PLCard title={`Today · ${fmtDate(`${sum.data.today.from}T12:00:00Z`)}`} r={sum.data.today} />
          <PLCard title={`This month · ${monthLabel(sum.data.this_month.from)}`} r={sum.data.this_month} />
        </>
      )}
      <p className="muted center">Profit = selling price minus buying price. Set buying prices under Inventory (products) and Tests &amp; Prices (tests).</p>
      <div className="no-print"><Segmented options={['Daily', 'Monthly']} value={view} onChange={setView} /></div>
      {view === 'Daily' && (
        <div className="two no-print">
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}
      {view === 'Monthly' && <p className="muted center">Last 12 months</p>}
      <Loader loading={rows.loading} error={rows.error} reload={rows.reload} />
      {rows.data && (list.length ? (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="pl-wrap">
              <table className="pl-table">
                <thead><tr><th>{view === 'Daily' ? 'Date' : 'Month'}</th><th>Selling</th><th>Buying</th><th>Profit / Loss</th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.from}>
                      <td>{label(r)}</td>
                      <td>{naira(r.total_revenue)}</td>
                      <td>{naira(r.total_cost)}</td>
                      <td style={tone(r.net_profit)}><b>{money(r.net_profit)}</b><div className="pl-tag">{resultLabel(r.result)}</div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td>Total</td><td>{naira(totals.total_revenue)}</td><td>{naira(totals.total_cost)}</td><td style={tone(totals.net_profit)}><b>{money(totals.net_profit)}</b></td></tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="btn-row no-print">
            <button type="button" className="btn btn-outline" onClick={() => window.print()}><Printer size={16} /> Print</button>
            <button type="button" className="btn btn-outline" onClick={() => downloadCsv(`profit-${view.toLowerCase()}.csv`, [[view === 'Daily' ? 'Date' : 'Month', 'Selling total', 'Buying total', 'Profit/Loss', 'Result'], ...list.map((r) => [r.from, r.total_revenue, r.total_cost, r.net_profit, resultLabel(r.result)])])}><Download size={16} /> CSV</button>
          </div>
        </>
      ) : <div className="empty">No data for this period.</div>)}
    </SShell>
  )
}
