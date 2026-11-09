import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import AppShell from './components/AppShell'
import Welcome from './pages/Welcome'
import EmployeeHome from './pages/employee/EmployeeHome'
import AssessmentCenter from './pages/employee/AssessmentCenter'
import AssessmentSession from './pages/employee/AssessmentSession'
import AssessmentReport from './pages/employee/AssessmentReport'
import RiskDetail from './pages/employee/RiskDetail'
import Intervention from './pages/employee/Intervention'
import MyRecords from './pages/employee/MyRecords'
import Dashboard from './pages/admin/Dashboard'
import Employees from './pages/admin/Employees'
import EmployeeDetail from './pages/admin/EmployeeDetail'
import RiskList from './pages/admin/RiskList'
import Alerts from './pages/admin/Alerts'
import TeamAnalysis from './pages/admin/TeamAnalysis'
import Interventions from './pages/admin/Interventions'
import Reports from './pages/admin/Reports'
import Settings from './pages/admin/Settings'

export default function App() {
  // file:// 打开单文件 HTML 时使用 HashRouter，避免浏览器 History API 限制。
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter

  return (
    <Router>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route element={<AppShell />}>
            <Route path="/employee" element={<EmployeeHome />} />
            <Route path="/employee/assessment" element={<AssessmentCenter />} />
            <Route path="/employee/assessment/report" element={<AssessmentReport />} />
            <Route path="/employee/assessment/:mode" element={<AssessmentSession />} />
            <Route path="/employee/risk" element={<RiskDetail />} />
            <Route path="/employee/intervention" element={<Intervention />} />
            <Route path="/employee/records" element={<MyRecords />} />

            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/employees" element={<Employees />} />
            <Route path="/admin/employees/:id" element={<EmployeeDetail />} />
            <Route path="/admin/risk" element={<RiskList />} />
            <Route path="/admin/alerts" element={<Alerts />} />
            <Route path="/admin/teams" element={<TeamAnalysis />} />
            <Route path="/admin/interventions" element={<Interventions />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </Router>
  )
}
