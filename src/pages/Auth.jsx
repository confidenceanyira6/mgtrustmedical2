import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../auth'
import { LogoMark } from '../ui'

function Brand({ size = 72, tagline = true }) {
  return (
    <div className="login-brand">
      <LogoMark size={size} />
      <h1>M.G TRUST<br /><span>MEDICAL</span></h1>
      {tagline && <p>Health &nbsp;•&nbsp; Care &nbsp;•&nbsp; Trust</p>}
    </div>
  )
}

function Password({ value, onChange, placeholder = 'Password', autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="pw">
      <input className="input" type={show ? 'text' : 'password'} placeholder={placeholder} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label="Show password">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  )
}

function Frame({ children, onBack }) {
  const { toastMsg } = useAuth()
  return (
    <div className="phone login">
      {onBack && <button type="button" className="icon-btn login-back" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button>}
      {children}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  )
}

export function Boot() {
  return <div className="phone login"><Brand size={64} /></div>
}

export function SetupNeeded() {
  return (
    <Frame>
      <Brand size={56} tagline={false} />
      <div className="card">
        <div className="card-title">Almost there</div>
        <p className="muted">Add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b> to your <b>.env</b> file (or your hosting provider's environment variables), then rebuild.</p>
      </div>
    </Frame>
  )
}

export function PendingApproval() {
  const { signOut } = useAuth()
  return (
    <Frame>
      <Brand size={56} tagline={false} />
      <div className="card">
        <div className="card-title">Account awaiting approval</div>
        <p className="muted">Your staff account has been created but has not been activated yet. Ask an administrator to activate it, then log in again.</p>
      </div>
      <button type="button" className="btn btn-outline" onClick={signOut}>Log out</button>
    </Frame>
  )
}

export function UnknownAccount() {
  const { signOut } = useAuth()
  return (
    <Frame>
      <Brand size={56} tagline={false} />
      <div className="card">
        <div className="card-title">Account not set up</div>
        <p className="muted">This login isn't linked to a patient or staff profile. Please contact the centre.</p>
      </div>
      <button type="button" className="btn btn-outline" onClick={signOut}>Log out</button>
    </Frame>
  )
}

export function ResetPassword() {
  const { updatePassword, toast } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return toast('Use at least 8 characters')
    if (pw !== pw2) return toast('Passwords do not match')
    setBusy(true)
    try { await updatePassword(pw); toast('Password updated') } catch (err) { toast(err.message) } finally { setBusy(false) }
  }
  return (
    <Frame>
      <Brand size={56} tagline={false} />
      <form className="login-form" onSubmit={submit}>
        <h2 className="auth-title">Set a new password</h2>
        <Password value={pw} onChange={setPw} placeholder="New password" autoComplete="new-password" />
        <Password value={pw2} onChange={setPw2} placeholder="Confirm new password" autoComplete="new-password" />
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update Password'}</button>
      </form>
    </Frame>
  )
}

function Login({ go }) {
  const { signIn, toast } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !pw) return toast('Enter your email and password')
    setBusy(true)
    try { await signIn(email, pw) } catch (err) { toast(err.message); setBusy(false) }
  }
  return (
    <Frame>
      <Brand size={56} tagline={false} />
      <form className="login-form" onSubmit={submit}>
        <h2 className="auth-title">Welcome Back</h2>
        <p className="muted center">Login to your account</p>
        <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Password value={pw} onChange={setPw} autoComplete="current-password" />
        <button type="button" className="link-btn right" onClick={() => go('forgot')}>Forgot Password?</button>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
        <p className="muted center">Don't have an account? <button type="button" className="link-btn inline" onClick={() => go('signup')}>Sign Up</button></p>
      </form>
    </Frame>
  )
}

function Signup({ go }) {
  const { signUp, toast } = useAuth()
  const [f, setF] = useState({ full_name: '', phone: '', email: '', sex: '', date_of_birth: '', password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const submit = async (e) => {
    e.preventDefault()
    if (f.full_name.trim().length < 2) return toast('Enter your full name')
    if (!f.phone.trim()) return toast('Enter your phone number')
    if (!f.email.trim()) return toast('Enter your email')
    if (f.password.length < 8) return toast('Use at least 8 characters for your password')
    if (f.password !== f.confirm) return toast('Passwords do not match')
    setBusy(true)
    try {
      const { needsConfirm } = await signUp({
        email: f.email, password: f.password, full_name: f.full_name.trim(), phone: f.phone.trim(),
        sex: f.sex || undefined, date_of_birth: f.date_of_birth || undefined,
      })
      if (needsConfirm) { toast('Check your email to confirm your account, then log in'); go('login') }
    } catch (err) { toast(err.message) } finally { setBusy(false) }
  }
  return (
    <Frame onBack={() => go('login')}>
      <Brand size={48} tagline={false} />
      <form className="login-form" onSubmit={submit}>
        <h2 className="auth-title">Create Account</h2>
        <input className="input" placeholder="Full Name" autoComplete="name" value={f.full_name} onChange={(e) => set('full_name')(e.target.value)} />
        <input className="input" type="tel" placeholder="Phone Number" autoComplete="tel" value={f.phone} onChange={(e) => set('phone')(e.target.value)} />
        <input className="input" type="email" placeholder="Email Address" autoComplete="email" value={f.email} onChange={(e) => set('email')(e.target.value)} />
        <div className="gender">
          {['male', 'female'].map((s) => (
            <button type="button" key={s} className={f.sex === s ? 'active' : ''} onClick={() => set('sex')(s)}>{s === 'male' ? 'Male' : 'Female'}</button>
          ))}
        </div>
        <label className="hint">Date of birth (helps us show the right lab reference ranges)</label>
        <input className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={f.date_of_birth} onChange={(e) => set('date_of_birth')(e.target.value)} />
        <Password value={f.password} onChange={set('password')} autoComplete="new-password" />
        <Password value={f.confirm} onChange={set('confirm')} placeholder="Confirm Password" autoComplete="new-password" />
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</button>
        <p className="muted center">Already have an account? <button type="button" className="link-btn inline" onClick={() => go('login')}>Login</button></p>
      </form>
    </Frame>
  )
}

function Forgot({ go }) {
  const { resetPassword, toast } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return toast('Enter your email')
    setBusy(true)
    try { await resetPassword(email); setSent(true) } catch (err) { toast(err.message) } finally { setBusy(false) }
  }
  return (
    <Frame onBack={() => go('login')}>
      <Brand size={56} tagline={false} />
      <form className="login-form" onSubmit={submit}>
        <h2 className="auth-title">Reset Password</h2>
        {sent ? (
          <p className="muted center">If an account exists for that email, a reset link is on its way. Open it on this device to set a new password.</p>
        ) : (
          <>
            <p className="muted center">Enter your email address and we'll send you a link to reset your password.</p>
            <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send Reset Link'}</button>
          </>
        )}
        <button type="button" className="link-btn" onClick={() => go('login')}>Back to Login</button>
      </form>
    </Frame>
  )
}

export default function AuthFlow() {
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('mg_seen') ? 'login' : 'splash' } catch { return 'login' }
  })
  const go = (v) => setView(v)
  if (view === 'splash') {
    const start = () => { try { localStorage.setItem('mg_seen', '1') } catch { /* ignore */ } setView('login') }
    return (
      <Frame>
        <Brand size={96} />
        <button type="button" className="btn btn-primary" onClick={start}>Get Started</button>
      </Frame>
    )
  }
  if (view === 'signup') return <Signup go={go} />
  if (view === 'forgot') return <Forgot go={go} />
  return <Login go={go} />
}
