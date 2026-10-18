import { Routes, Route, Navigate } from 'react-router-dom'
import './staff.css'
import { StaffHome, More } from './Home'
import { Patients } from './Patients'
import { Branches, TestsAndPrices } from './Catalogue'
import { Billing, NewBill, ReceiptView } from './Billing'
import { Sales, Products } from './Sales'
import { Lab, LabItem } from './Lab'
import { Appointments } from './Appointments'
import { Reports } from './Reports'
import { Inbox, StaffThread, Originals } from './Inbox'
import { Users, Audit, Expenses, SettingsPage } from './Admin'

export default function StaffApp() {
  return (
    <Routes>
      <Route path="/" element={<StaffHome />} />
      <Route path="/more" element={<More />} />
      <Route path="/patients" element={<Patients />} />
      <Route path="/branches" element={<Branches />} />
      <Route path="/services" element={<TestsAndPrices />} />
      <Route path="/billing" element={<Billing />} />
      <Route path="/billing/new" element={<NewBill />} />
      <Route path="/receipt/:type/:id" element={<ReceiptView />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/products" element={<Products />} />
      <Route path="/lab" element={<Lab />} />
      <Route path="/lab/:id" element={<LabItem />} />
      <Route path="/appointments" element={<Appointments />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/messages" element={<Inbox />} />
      <Route path="/messages/:id" element={<StaffThread />} />
      <Route path="/originals" element={<Originals />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/users" element={<Users />} />
      <Route path="/audit" element={<Audit />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
