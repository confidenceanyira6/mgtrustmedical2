import { createContext, useCallback, useContext, useState } from 'react'
import { supabase, query } from './supabase'
import { useLoad } from './ui'

const Ctx = createContext(null)
export const useBranch = () => useContext(Ctx)
const KEY = 'mg_branch'

export const mapsLink = (b) => (b.latitude != null && b.longitude != null
  ? `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([b.address, b.city, b.state].filter(Boolean).join(', '))}`)

export function distanceKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

// Patient-side branch selection. Branches and what they offer come only from the database.
export function BranchProvider({ children }) {
  const { data, loading, error, reload } = useLoad(() => query(
    supabase.from('branches').select('id,name,address,city,state,phone,email,latitude,longitude,branch_services(count)').eq('is_active', true).order('name'),
  ))
  const [id, setId] = useState(() => { try { return localStorage.getItem(KEY) || '' } catch { return '' } })
  const branches = data || []
  const offering = branches.filter((b) => (b.branch_services?.[0]?.count || 0) > 0)
  const selected = branches.find((b) => b.id === id) || (offering.length === 1 ? offering[0] : null)
  const choose = useCallback((bid) => {
    setId(bid)
    try { localStorage.setItem(KEY, bid) } catch { /* ignore */ }
  }, [])
  return <Ctx.Provider value={{ branches, offering, selected, choose, loading, error, reload }}>{children}</Ctx.Provider>
}
