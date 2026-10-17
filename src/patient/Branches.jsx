import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Phone } from 'lucide-react'
import { useBranch, mapsLink, distanceKm } from '../branch'
import { Shell, Loader, patientNav } from '../ui'

export function Branches() {
  const navigate = useNavigate()
  const { branches, selected, choose, loading, error, reload } = useBranch()
  const [pos, setPos] = useState(null)
  const [geoErr, setGeoErr] = useState('')

  const locate = () => {
    setGeoErr('')
    if (!navigator.geolocation) return setGeoErr('Location is not available on this device.')
    return navigator.geolocation.getCurrentPosition(
      (p) => setPos({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => setGeoErr('Location permission was not granted.'),
      { timeout: 10000 },
    )
  }
  const list = branches
    .map((b) => ({ ...b, km: pos && b.latitude != null ? distanceKm(pos, b) : null }))
    .sort((a, b) => (a.km != null && b.km != null ? a.km - b.km : a.name.localeCompare(b.name)))

  return (
    <Shell title="Our Branches" nav={patientNav}>
      <Loader loading={loading} error={error} reload={reload} />
      {!loading && !error && !branches.length && <div className="empty">No branch is open for booking yet. Please check back soon.</div>}
      {branches.length > 1 && (
        <>
          <button type="button" className="btn btn-outline" onClick={locate}><Navigation size={16} /> {pos ? 'Sorted by distance from you' : 'Find the branch nearest me'}</button>
          {geoErr && <p className="err">{geoErr}</p>}
        </>
      )}
      {list.map((b) => {
        const n = b.branch_services?.[0]?.count || 0
        const isSel = selected?.id === b.id
        return (
          <div className={`card branch ${isSel ? 'sel' : ''}`} key={b.id}>
            <div className="row-title">{b.name}</div>
            <div className="row-sub"><MapPin size={12} /> {[b.address, b.city, b.state].filter(Boolean).join(', ')}</div>
            {b.km != null && <div className="row-sub">{b.km < 1 ? `${Math.round(b.km * 1000)} m` : `${b.km.toFixed(1)} km`} away</div>}
            <div className="row-sub">{n ? `${n} ${n === 1 ? 'test' : 'tests'} available` : 'No tests listed yet'}</div>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <a className="btn btn-outline" href={mapsLink(b)} target="_blank" rel="noreferrer"><Navigation size={15} /> Directions</a>
              {b.phone ? <a className="btn btn-outline" href={`tel:${b.phone}`}><Phone size={15} /> Call</a> : <span />}
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} disabled={!n} onClick={() => { choose(b.id); navigate('/services') }}>
              {isSel ? 'Selected — view tests' : n ? 'Book at this branch' : 'Not bookable yet'}
            </button>
          </div>
        )
      })}
    </Shell>
  )
}
