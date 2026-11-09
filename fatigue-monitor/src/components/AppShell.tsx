import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bell,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  ShieldPlus,
  Sun,
  Users,
  X,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Avatar, Button, IconButton, RiskBadge, ToastStack, cn } from './ui'

const EMPLOYEE_NAV = [
  { to: '/employee', label: '今日状态', icon: HeartPulse, end: true },
  { to: '/employee/assessment', label: '多模态测评', icon: BrainCircuit },
  { to: '/employee/risk', label: '风险解释', icon: ShieldPlus },
  { to: '/employee/intervention', label: '干预与恢复', icon: LifeBuoy },
  { to: '/employee/records', label: '我的记录', icon: ClipboardList },
]

const ADMIN_NAV = [
  { to: '/admin', label: '风险管理驾驶舱', icon: LayoutDashboard, end: true },
  { to: '/admin/employees', label: '员工管理', icon: Users },
  { to: '/admin/risk', label: '风险名单', icon: ShieldCheck },
  { to: '/admin/alerts', label: '预警中心', icon: Bell },
  { to: '/admin/teams', label: '班组分析', icon: BarChart3 },
  { to: '/admin/interventions', label: '干预管理', icon: ClipboardCheck },
  { to: '/admin/reports', label: '报告中心', icon: FileBarChart },
  { to: '/admin/settings', label: '系统设置', icon: Settings },
]

const TITLES: Record<string, { title: string; eyebrow: string }> = {
  '/employee': { title: '今日状态', eyebrow: '员工工作台' },
  '/employee/assessment': { title: '多模态疲劳测评', eyebrow: '员工工作台' },
  '/employee/assessment/quick': { title: '快速测评', eyebrow: '多模态评估' },
  '/employee/assessment/full': { title: '完整测评', eyebrow: '多模态评估' },
  '/employee/assessment/report': { title: '测评报告', eyebrow: '员工工作台' },
  '/employee/risk': { title: '风险解释', eyebrow: '员工工作台' },
  '/employee/intervention': { title: '干预与恢复', eyebrow: '员工工作台' },
  '/employee/records': { title: '我的记录', eyebrow: '员工工作台' },
  '/admin': { title: '风险管理驾驶舱', eyebrow: '安全管理中心' },
  '/admin/employees': { title: '员工管理', eyebrow: '安全管理中心' },
  '/admin/risk': { title: '风险名单', eyebrow: '安全管理中心' },
  '/admin/alerts': { title: '预警中心', eyebrow: '安全管理中心' },
  '/admin/teams': { title: '班组分析', eyebrow: '安全管理中心' },
  '/admin/interventions': { title: '干预管理', eyebrow: '安全管理中心' },
  '/admin/reports': { title: '报告中心', eyebrow: '安全管理中心' },
  '/admin/settings': { title: '系统设置', eyebrow: '安全管理中心' },
}

function getTitle(pathname: string) {
  if (pathname.startsWith('/admin/employees/')) return { title: '员工详情', eyebrow: '安全管理中心' }
  return TITLES[pathname] ?? { title: '工作台', eyebrow: 'SafePulse' }
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <Activity size={20} strokeWidth={2.4} />
    </span>
  )
}

export default function AppShell() {
  const {
    role,
    setRole,
    currentEmployee,
    theme,
    toggleTheme,
    notifications,
    markNotificationsRead,
    alerts,
    resetDemo,
  } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const expectedRole = location.pathname.startsWith('/admin') ? 'admin' : 'employee'
  const navItems = role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV
  const unread = notifications.filter((item) => !item.read).length
  const openAlerts = alerts.filter((alert) => ['pending', 'escalated', 'in_progress', 'pending_retest'].includes(alert.status)).length
  const pageMeta = getTitle(location.pathname)
  const currentTitle = useMemo(() => pageMeta, [pageMeta])

  useEffect(() => {
    setNotificationsOpen(false)
    setMobileNavOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (role && role !== expectedRole) {
      navigate(role === 'admin' ? '/admin' : '/employee', { replace: true })
    }
  }, [expectedRole, navigate, role])

  if (!role) return <Navigate to="/" replace />

  const switchRole = (nextRole: 'employee' | 'admin') => {
    setRole(nextRole)
    navigate(nextRole === 'admin' ? '/admin' : '/employee')
  }

  return (
    <div className={cn('app-shell', role === 'employee' && 'is-employee')}>
      <aside className={cn('sidebar', mobileNavOpen && 'is-open')}>
        <div className="sidebar-brand">
          <BrandMark />
          <div>
            <strong>SafePulse</strong>
            <span>职业疲劳智能预警</span>
          </div>
          <IconButton label="关闭导航" className="sidebar-close" onClick={() => setMobileNavOpen(false)}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="sidebar-context">
          <span className="context-label">当前工作区</span>
          <div className="context-name">
            <span className="workspace-dot" />
            华东化工 · 生产一部
            <ChevronDown size={14} />
          </div>
        </div>

        <nav className="sidebar-nav" aria-label={role === 'admin' ? '管理端导航' : '员工端导航'}>
          <span className="nav-section-label">{role === 'admin' ? '安全管理' : '个人工作台'}</span>
          {navItems.map((item) => {
            const Icon = item.icon
            const badge =
              role === 'admin' && item.to === '/admin/alerts'
                ? openAlerts
                : role === 'employee' && item.to === '/employee/intervention'
                  ? alerts.filter(
                      (alert) =>
                        alert.employeeId === currentEmployee.id &&
                        ['pending', 'in_progress', 'pending_retest'].includes(alert.status),
                    ).length
                  : 0
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn('nav-link', isActive && 'is-active')}
                onClick={() => setMobileNavOpen(false)}
              >
                <Icon size={18} strokeWidth={1.9} />
                <span>{item.label}</span>
                {badge > 0 && <em>{badge}</em>}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <div>
              <strong>隐私保护已启用</strong>
              <span>数据仅用于职业疲劳风险管理</span>
            </div>
          </div>
          <button className="demo-reset" onClick={resetDemo}>
            重置演示数据
          </button>
          <div className="sidebar-user">
            <Avatar name={currentEmployee.name} color={currentEmployee.avatarColor} size="sm" />
            <div>
              <strong>{role === 'admin' ? '李建国' : currentEmployee.name}</strong>
              <span>{role === 'admin' ? '安全管理员' : currentEmployee.job}</span>
            </div>
            <button
              className="sidebar-user-menu"
              aria-label="用户菜单"
              onClick={() => setUserMenuOpen((open) => !open)}
            >
              <ChevronDown size={14} />
            </button>
          </div>
          {userMenuOpen && (
            <div className="user-popover">
              <button onClick={() => switchRole(role === 'admin' ? 'employee' : 'admin')}>
                切换到{role === 'admin' ? '员工端' : '管理端'}
              </button>
              <button onClick={() => navigate('/')}>返回角色选择</button>
              <button onClick={resetDemo}>重置演示数据</button>
            </div>
          )}
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-scrim" aria-label="关闭导航" onClick={() => setMobileNavOpen(false)} />}

      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton label="打开导航" className="mobile-menu" onClick={() => setMobileNavOpen(true)}>
              <Menu size={20} />
            </IconButton>
            <div className="topbar-title">
              <span>{currentTitle.eyebrow}</span>
              <strong>{currentTitle.title}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="role-switch" role="group" aria-label="切换演示角色">
              <button
                className={cn(role === 'employee' && 'is-active')}
                onClick={() => switchRole('employee')}
              >
                员工端
              </button>
              <button
                className={cn(role === 'admin' && 'is-active')}
                onClick={() => switchRole('admin')}
              >
                管理端
              </button>
            </div>
            <span className="demo-badge">演示环境</span>
            <IconButton label={theme === 'light' ? '切换深色模式' : '切换浅色模式'} onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </IconButton>
            <IconButton
              label="通知"
              className="notification-button"
              onClick={() => {
                setNotificationsOpen(true)
                markNotificationsRead()
              }}
            >
              <Bell size={18} />
              {unread > 0 && <span className="notification-dot">{unread}</span>}
            </IconButton>
            <div className="topbar-user">
              <Avatar name={role === 'admin' ? '李建国' : currentEmployee.name} color={role === 'admin' ? '#dbeafe' : currentEmployee.avatarColor} size="sm" />
              <div>
                <strong>{role === 'admin' ? '李建国' : currentEmployee.name}</strong>
                <span>{role === 'admin' ? '安全管理' : '一线员工'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>

      {role === 'employee' && (
        <nav className="mobile-tabbar" aria-label="员工端底部导航">
          {EMPLOYEE_NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn('mobile-tab', isActive && 'is-active')}
              >
                <Icon size={20} strokeWidth={1.9} />
                <span>{item.label.replace('多模态', '').replace('与恢复', '')}</span>
              </NavLink>
            )
          })}
        </nav>
      )}

      {notificationsOpen && (
        <>
          <button className="drawer-scrim" onClick={() => setNotificationsOpen(false)} aria-label="关闭通知" />
          <aside className="notification-drawer" aria-label="通知中心">
            <div className="drawer-head">
              <div>
                <span className="eyebrow">消息</span>
                <h2>通知中心</h2>
              </div>
              <IconButton label="关闭通知" onClick={() => setNotificationsOpen(false)}>
                <X size={18} />
              </IconButton>
            </div>
            <div className="drawer-actions">
              <span>{notifications.length} 条通知</span>
              <Button variant="ghost" size="sm" onClick={markNotificationsRead}>
                全部标为已读
              </Button>
            </div>
            <div className="notification-list">
              {notifications.map((notification) => (
                <article key={notification.id} className={cn('notification-item', !notification.read && 'is-unread')}>
                  <div className="notification-item-top">
                    <RiskBadge level={notification.level} size="sm" />
                    <span>{notification.time}</span>
                  </div>
                  <strong>{notification.title}</strong>
                  <p>{notification.body}</p>
                </article>
              ))}
              {notifications.length === 0 && <div className="empty-inline">暂无通知</div>}
            </div>
            <div className="drawer-foot">
              <CalendarDays size={15} />
              高风险与严重风险通知不可静音
            </div>
          </aside>
        </>
      )}

      <ToastStack />
    </div>
  )
}
