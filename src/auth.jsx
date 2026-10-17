import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase, configured } from './supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
const base = () => window.location.origin + window.location.pathname

export function AuthProvider({ children }) {
  const [kind, setKind] = useState(null) // 'patient' | 'staff' | 'pending' | 'unknown' | null
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(configured)
  const [recovery, setRecovery] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const timer = useRef()
  const uid = useRef(null)

  const toast = useCallback((m) => {
    setToastMsg(m)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToastMsg(''), 2800)
  }, [])

  const resolve = useCallback(async (sess) => {
    try {
      if (!sess) { setKind(null); setProfile(null); return }
      const u = sess.user
      if (u.user_metadata?.account_type === 'patient') {
        const { data, error } = await supabase.rpc('get_my_profile')
        if (!error && data) { setProfile(data); setKind('patient'); return }
      }
      const { data: staff } = await supabase.from('staff_profiles').select('*').eq('id', u.id).maybeSingle()
      if (staff) { setProfile(staff); setKind(staff.is_active ? 'staff' : 'pending'); return }
      setProfile(null)
      setKind('unknown')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!configured) return undefined
    supabase.auth.getSession().then(({ data }) => {
      uid.current = data.session?.user.id ?? null
      resolve(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') { uid.current = null; setKind(null); setProfile(null); setLoading(false); return }
      if (sess && sess.user.id === uid.current && event !== 'USER_UPDATED') return
      uid.current = sess?.user.id ?? null
      setLoading(true)
      setTimeout(() => resolve(sess), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [resolve])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
  }
  const signUp = async ({ email, password, ...meta }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: base(), data: { account_type: 'patient', ...meta } },
    })
    if (error) throw error
    return { needsConfirm: !data.session }
  }
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: base() })
    if (error) throw error
  }
  const updatePassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setRecovery(false)
  }
  const signOut = async () => { await supabase.auth.signOut() }
  const refreshProfile = () => supabase.auth.getSession().then(({ data }) => resolve(data.session))

  const value = { kind, profile, loading, recovery, toast, toastMsg, signIn, signUp, resetPassword, updatePassword, signOut, refreshProfile }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
