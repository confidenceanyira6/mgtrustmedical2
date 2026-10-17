import { useAuth } from './auth'
import { configured } from './supabase'
import AuthFlow, { ResetPassword, PendingApproval, SetupNeeded, UnknownAccount, Boot } from './pages/Auth'
import PatientApp from './patient/PatientApp'
import StaffApp from './staff/StaffApp'

export default function App() {
  const a = useAuth()
  if (!configured) return <SetupNeeded />
  if (a.loading) return <Boot />
  if (a.recovery) return <ResetPassword />
  if (!a.kind) return <AuthFlow />
  if (a.kind === 'pending') return <PendingApproval />
  if (a.kind === 'patient') return <PatientApp />
  if (a.kind === 'staff') return <StaffApp />
  return <UnknownAccount />
}
