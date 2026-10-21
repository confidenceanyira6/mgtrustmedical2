import { BarChart3, Building2, CalendarDays, FileText, FlaskConical, MessageSquare, Package, Receipt, Settings, Shield, ShoppingCart, Stethoscope, TrendingUp, UserCog, Users, Wallet } from 'lucide-react'

export const MODULES = [
  { to: '/patients', label: 'Patient Registration', Icon: Users, who: 'front' },
  { to: '/appointments', label: 'Appointments', Icon: CalendarDays, who: 'fl' },
  { to: '/billing', label: 'Service Billings', Icon: Receipt, who: 'front' },
  { to: '/lab', label: 'Service & Laboratory', Icon: FlaskConical, who: 'fl' },
  { to: '/sales', label: 'Sales', Icon: ShoppingCart, who: 'sales' },
  { to: '/products', label: 'Inventory', Icon: Package, who: 'sales' },
  { to: '/profit', label: 'Profit & Loss', Icon: TrendingUp, who: 'admin' },
  { to: '/services', label: 'Tests & Prices', Icon: Stethoscope, who: 'all' },
  { to: '/branches', label: 'Branches', Icon: Building2, who: 'admin' },
  { to: '/reports', label: 'Reports & Analytics', Icon: BarChart3, who: 'all' },
  { to: '/messages', label: 'Messages', Icon: MessageSquare, who: 'front' },
  { to: '/originals', label: 'Original Reports', Icon: FileText, who: 'fl' },
  { to: '/expenses', label: 'Expenses', Icon: Wallet, who: 'admin' },
  { to: '/users', label: 'User Management', Icon: UserCog, who: 'admin' },
  { to: '/audit', label: 'Audit Logs', Icon: Shield, who: 'admin' },
  { to: '/settings', label: 'Settings', Icon: Settings, who: 'admin' },
]
