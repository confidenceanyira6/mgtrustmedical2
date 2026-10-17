import { Routes, Route, Navigate } from 'react-router-dom'
import { BranchProvider } from '../branch'
import PatientHome from './Home'
import { Branches } from './Branches'
import { LabServices, TestDetails, BookTest } from './Tests'
import { MyAppointments, AppointmentDetail } from './Appointments'
import { MyResults, ReportView } from './Results'
import { Messages, Thread } from './Messages'
import { Profile, Notifications, Bills, Help, About } from './Profile'

export default function PatientApp() {
  return (
    <BranchProvider>
      <Routes>
        <Route path="/" element={<PatientHome />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/services" element={<LabServices />} />
        <Route path="/services/:id" element={<TestDetails />} />
        <Route path="/book/:id" element={<BookTest />} />
        <Route path="/appointments" element={<MyAppointments />} />
        <Route path="/appointments/:id" element={<AppointmentDetail />} />
        <Route path="/results" element={<MyResults />} />
        <Route path="/results/:id" element={<ReportView />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Thread />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/help" element={<Help />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BranchProvider>
  )
}
