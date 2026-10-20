import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { rpc } from '../supabase'
import { useLoad, Loader, Segmented, Kv, naira, fmtDate, todayLagos } from '../ui'
import { SShell, useRole } from './common'

const ROWS = [['total_patients', 'Patients registered'], ['new_patients', 'New patients'], ['returning_patients', 'Returning patients'], ['laboratory_services', 'Lab tests billed'], ['laboratory_revenue', 'Lab revenue', 1], ['products_sold', 'Products sold'], ['service_revenue', 'Service revenue', 1], ['product_revenue', 'Product revenue', 1], ['total_revenue', 'Total revenue', 1], ['outstanding_balance', 'Outstanding balance', 1], ['voided_bills', 'Voided bills'], ['voided_sales', 'Voided sales'], ['product_cost', 'Cost of products sold', 1], ['expenses', 'Expenses', 1], ['net_profit', 'Net profit', 1]]
const fmt = (v, money) => (money ? naira(v) : Number(v ?? 0).toLocaleString('en-NG'))
const money = (n) => (Number(n) < 0 ? '-' : '') + naira(Math.abs(Number(n) || 0))
const tone = (n) => ({ color: n > 0 ? '#067647' : n < 0 ? '#b42318' : undefined })
const resultLabel = (r) => (r === 'profit' ? 'Profit' : r === 'loss' ? 'Loss' : 'Break-even')
const resultClass = (r) => (r === 'profit' ? 'ok' : r === 'loss' ? 'bad' : 'info')

function downloadCsv(name, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function Summary({ r, title }) {
  const rows = ROWS.filter(([k]) => r[k] !== undefined && r[k] !== null)
  return (
    <>
      <div className="card rpt">
        <div className="center"><div className="rpt-name">M.G TRUST MEDICAL</div><div className="muted">{title}: {r.from === r.to ? r.from : `${r.from} to ${r.to}`}</div></div>
        {rows.map(([k, label, isMoney]) => (<div className="kv" key={k}><span>{label}</span><b>{fmt(r[k], isMoney)}</b></div>))}
      </div>
      <div className="btn-row no-print">
        <button type="button" className="btn btn-outline" onClick={() => window.print()}><Printer size={16} /> Print</button>
        <button type="button" className="btn btn-outline" onClick={() => downloadCsv(`report-${r.from}-${r.to}.csv`, [['Item', 'Value'], ...rows.map(([k, l]) => [l, r[k]])])}><Download size={16} /> CSV</button>
      </div>
    </>
  )
}

function Bars({ data, x, y, money: isMoney }) {
  if (!data?.length) return <div className="empty">No data for this period.</div>
  const W = 320, H = 120, P = 8
  const max = Math.max(...data.map((d) => Number(d[y]) || 0), 1)
  const bw = (W - P * 2) / data.length
  const every = Math.ceil(data.length / 6)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 24}`}>
      <text x={P} y="9">{fmt(max, isMoney)}</text>
      {data.map((d, i) => {
        const h = ((Number(d[y]) || 0) / max) * H
        return (
          <g key={i}>
            <rect x={P + i * bw + bw * 0.15} y={H + 12 - h} width={bw * 0.7} height={Math.max(h, 1)} rx="3" fill="#1570ef" />
            {i % every === 0 && <text x={P + i * bw + bw / 2} y={H + 23} textAnchor="middle">{String(d[x]).slice(5)}</text>}
          </g>
        )
      })}
    </svg>
  )
}

function Top({ title, rows, value, money: isMoney }) {
  if (!rows?.length) return null
  return (
    <div className="card"><div className="card-title">{title}</div>
      {rows.slice(0, 8).map((r, i) => (<div className="kv" key={i}><span style={{ textTransform: 'none' }}>{r.name || r.category || r.age_group || r.sex}</span><b>{fmt(r[value], isMoney)}</b></div>))}
    </div>
  )
}

const monthStart = () => `${todayLagos().slice(0, 8)}01`
const monthsBack = (n) => {
  const [y, m] = todayLagos().slice(0, 7).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 10)
}
const monthLabel = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function PLCard({ title, r }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="center" style={{ margin: '6px 0 12px' }}>
        <div style={{ fontSize: 26, fontWeight: 700, ...tone(r.net_profit) }}>{money(r.net_profit)}</div>
        <span className={`pill ${resultClass(r.result)}`}>{resultLabel(r.result)}</span>
      </div>
      <Kv k="Service revenue" v={naira(r.service_revenue)} />
      <Kv k="Product revenue" v={naira(r.product_revenue)} />
      <Kv k="Total revenue" v={naira(r.total_revenue)} />
      <Kv k="Cost of products sold" v={naira(r.product_cost)} />
      <Kv k="Gross profit" v={money(r.gross_profit)} />
      <Kv k="Expenses" v={naira(r.expenses)} />
      <Kv k="Net profit / loss" v={money(r.net_profit)} />
    </div>
  )
}

function ProfitLoss() {
  const [view, setView] = useState('Daily')
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayLagos())
  const sum = useLoad(() => rpc('profit_summary'), [])
  const rows = useLoad(() => (view === 'Daily'
    ? rpc('profit_loss_daily', { p_from: from, p_to: to })
    : rpc('profit_loss_monthly', { p_from: monthsBack(11), p_to: todayLagos() })), [view, from, to])
  const list = [...(rows.data || [])].reverse()
  const label = (r) => (view === 'Daily' ? fmtDate(`${r.from}T12:00:00Z`) : monthLabel(r.from))
  const totals = list.reduce((t, r) => ({
    total_revenue: t.total_revenue + Number(r.total_revenue), product_cost: t.product_cost + Number(r.product_cost),
    expenses: t.expenses + Number(r.expenses), net_profit: t.net_profit + Number(r.net_profit),
  }), { total_revenue: 0, product_cost: 0, expenses: 0, net_profit: 0 })
  return (
    <>
      <Loader loading={sum.loading} error={sum.error} reload={sum.reload} />
      {sum.data && (<>
        <PLCard title={`Today · ${fmtDate(`${sum.data.today.from}T12:00:00Z`)}`} r={sum.data.today} />
        <PLCard title={`This month · ${monthLabel(sum.data.this_month.from)}`} r={sum.data.this_month} />
      </>)}
      <div className="no-print"><Segmented options={['Daily', 'Monthly']} value={view} onChange={setView} /></div>
      {view === 'Daily' && (
        <div className="two no-print"><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      )}
      {view === 'Monthly' && <p className="muted center">Last 12 months</p>}
      <Loader loading={rows.loading} error={rows.error} reload={rows.reload} />
      {rows.data && (list.length ? (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="pl-wrap">
              <table className="pl-table">
                <thead><tr><th>{view === 'Daily' ? 'Date' : 'Month'}</th><th>Revenue</th><th>Cost</th><th>Expenses</th><th>Profit / Loss</th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.from}>
                      <td>{label(r)}</td>
                      <td>{naira(r.total_revenue)}</td>
                      <td>{naira(r.product_cost)}</td>
                      <td>{naira(r.expenses)}</td>
                      <td style={tone(r.net_profit)}><b>{money(r.net_profit)}</b><div className="pl-tag">{resultLabel(r.result)}</div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td>Total</td><td>{naira(totals.total_revenue)}</td><td>{naira(totals.product_cost)}</td><td>{naira(totals.expenses)}</td><td style={tone(totals.net_profit)}><b>{money(totals.net_profit)}</b></td></tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="btn-row no-print">
            <button type="button" className="btn btn-outline" onClick={() => window.print()}><Printer size={16} /> Print</button>
            <button type="button" className="btn btn-outline" onClick={() => downloadCsv(`profit-loss-${view.toLowerCase()}.csv`, [[view === 'Daily' ? 'Date' : 'Month', 'Service revenue', 'Product revenue', 'Total revenue', 'Product cost', 'Expenses', 'Net profit/loss', 'Result'], ...list.map((r) => [r.from, r.service_revenue, r.product_revenue, r.total_revenue, r.product_cost, r.expenses, r.net_profit, resultLabel(r.result)])])}><Download size={16} /> CSV</button>
          </div>
        </>
      ) : <div className="empty">No data for this period.</div>)}
    </>
  )
}

export function Reports() {
  const { isAdmin } = useRole()
  const [tab, setTab] = useState('Daily')
  const [date, setDate] = useState(todayLagos())
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayLagos())
  const [bucket, setBucket] = useState('day')
  const daily = useLoad(() => (tab === 'Daily' ? rpc('generate_daily_report', { p_date: date }) : Promise.resolve(null)), [tab, date])
  const range = useLoad(() => (tab === 'Total' ? rpc('total_report', { p_from: from, p_to: to }) : Promise.resolve(null)), [tab, from, to])
  const an = useLoad(() => (tab === 'Analytics' ? rpc('analytics_dashboard', { p_from: from, p_to: to, p_bucket: bucket }) : Promise.resolve(null)), [tab, from, to, bucket])
  const dates = (
    <div className="two no-print"><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
  )
  return (
    <SShell title="Reports & Analytics" back={false}>
      <div className="no-print"><Segmented options={isAdmin ? ['Daily', 'Total', 'Analytics', 'Profit/Loss'] : ['Daily', 'Total', 'Analytics']} value={tab} onChange={setTab} /></div>
      {tab === 'Daily' && (<>
        <input className="input no-print" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Loader loading={daily.loading} error={daily.error} reload={daily.reload} />
        {daily.data && <Summary r={daily.data} title="Daily Report" />}
      </>)}
      {tab === 'Total' && (<>
        {dates}
        <Loader loading={range.loading} error={range.error} reload={range.reload} />
        {range.data && <Summary r={range.data} title="Total Report" />}
      </>)}
      {tab === 'Profit/Loss' && isAdmin && <ProfitLoss />}
      {tab === 'Analytics' && (<>
        {dates}
        <select className="input" value={bucket} onChange={(e) => setBucket(e.target.value)}><option value="day">By day</option><option value="week">By week</option><option value="month">By month</option></select>
        <Loader loading={an.loading} error={an.error} reload={an.reload} />
        {an.data && (<>
          <div className="stat-grid">
            <div className="stat"><b>{an.data.summary.total_patients}</b><span>Patients</span></div>
            <div className="stat"><b>{naira(an.data.summary.total_revenue)}</b><span>Revenue</span></div>
            <div className="stat"><b>{an.data.summary.laboratory_services}</b><span>Lab tests</span></div>
            <div className="stat"><b>{naira(an.data.summary.outstanding_balance)}</b><span>Outstanding</span></div>
          </div>
          <div className="card"><div className="card-title">Patient registration trend</div><Bars data={an.data.patients_over_time} x="period" y="visits" /></div>
          <div className="card"><div className="card-title">Revenue</div><Bars data={an.data.revenue_over_time} x="period" y="total_revenue" money /></div>
          <Top title="Most used services" rows={an.data.most_used_services} value="times_used" />
          <Top title="Highest revenue services" rows={an.data.highest_revenue_services} value="revenue" money />
          <Top title="Laboratory usage" rows={an.data.laboratory_usage} value="times_used" />
          <Top title="Most sold products" rows={an.data.most_sold_products} value="units_sold" />
          <Top title="Low stock" rows={an.data.low_stock} value="quantity_in_stock" />
          <Top title="Patients by sex" rows={an.data.sex_distribution} value="patients" />
          <Top title="Patients by age group" rows={an.data.age_groups} value="patients" />
          <Top title="Expenses by category" rows={an.data.expenses_by_category} value="total" money />
        </>)}
      </>)}
    </SShell>
  )
}
