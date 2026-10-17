import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { rpc } from '../supabase'
import { useLoad, Loader, Segmented, naira, todayLagos } from '../ui'
import { SShell } from './common'

const ROWS = [['total_patients', 'Patients registered'], ['new_patients', 'New patients'], ['returning_patients', 'Returning patients'], ['laboratory_services', 'Lab tests billed'], ['laboratory_revenue', 'Lab revenue', 1], ['products_sold', 'Products sold'], ['service_revenue', 'Service revenue', 1], ['product_revenue', 'Product revenue', 1], ['total_revenue', 'Total revenue', 1], ['outstanding_balance', 'Outstanding balance', 1], ['voided_bills', 'Voided bills'], ['voided_sales', 'Voided sales'], ['expenses', 'Expenses', 1], ['net_profit', 'Net profit', 1]]
const fmt = (v, money) => (money ? naira(v) : Number(v ?? 0).toLocaleString('en-NG'))

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
        {rows.map(([k, label, money]) => (<div className="kv" key={k}><span>{label}</span><b>{fmt(r[k], money)}</b></div>))}
      </div>
      <div className="btn-row no-print">
        <button type="button" className="btn btn-outline" onClick={() => window.print()}><Printer size={16} /> Print</button>
        <button type="button" className="btn btn-outline" onClick={() => downloadCsv(`report-${r.from}-${r.to}.csv`, [['Item', 'Value'], ...rows.map(([k, l]) => [l, r[k]])])}><Download size={16} /> CSV</button>
      </div>
    </>
  )
}

function Bars({ data, x, y, money }) {
  if (!data?.length) return <div className="empty">No data for this period.</div>
  const W = 320, H = 120, P = 8
  const max = Math.max(...data.map((d) => Number(d[y]) || 0), 1)
  const bw = (W - P * 2) / data.length
  const every = Math.ceil(data.length / 6)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 24}`}>
      <text x={P} y="9">{fmt(max, money)}</text>
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

function Top({ title, rows, value, money }) {
  if (!rows?.length) return null
  return (
    <div className="card"><div className="card-title">{title}</div>
      {rows.slice(0, 8).map((r, i) => (<div className="kv" key={i}><span style={{ textTransform: 'none' }}>{r.name || r.category || r.age_group || r.sex}</span><b>{fmt(r[value], money)}</b></div>))}
    </div>
  )
}

const monthStart = () => `${todayLagos().slice(0, 8)}01`

export function Reports() {
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
      <div className="no-print"><Segmented options={['Daily', 'Total', 'Analytics']} value={tab} onChange={setTab} /></div>
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
