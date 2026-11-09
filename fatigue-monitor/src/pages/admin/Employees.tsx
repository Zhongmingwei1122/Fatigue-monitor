import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  UserPlus,
  Users,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { TEAMS } from '../../data/mockData'
import type { RiskLevel, ShiftType } from '../../types'
import { getRiskMeta } from '../../lib/risk'
import { Avatar, Button, Card, EmptyState, FormField, Modal, PageHeader, RiskBadge, cn } from '../../components/ui'

const PAGE_SIZE = 10

const DEVICE_LABELS = {
  connected: '已连接',
  not_worn: '未佩戴',
  offline: '离线',
  syncing: '同步中',
}

export default function Employees() {
  const { employees, addEmployee, toggleEmployeeStatus, addToast } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')
  const [deviceFilter, setDeviceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    employeeNo: '',
    job: '化工操作员',
    team: TEAMS[0].name,
    shift: '白班' as ShiftType,
    safetySensitive: true,
    phone: '',
    device: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filtered = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesQuery =
          !query.trim() ||
          employee.name.includes(query.trim()) ||
          employee.employeeNo.toLowerCase().includes(query.trim().toLowerCase())
        return (
          matchesQuery &&
          (teamFilter === 'all' || employee.team === teamFilter) &&
          (shiftFilter === 'all' || employee.shift === shiftFilter) &&
          (riskFilter === 'all' || employee.riskLevel === riskFilter) &&
          (deviceFilter === 'all' || employee.deviceStatus === deviceFilter)
        )
      }),
    [deviceFilter, employees, query, riskFilter, shiftFilter, teamFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const activeCount = employees.filter((employee) => employee.status === 'active').length
  const onlineCount = employees.filter((employee) => employee.deviceStatus === 'connected').length
  const pendingCount = employees.filter((employee) => employee.riskLevel === 'pending').length

  const resetFilters = () => {
    setQuery('')
    setTeamFilter('all')
    setShiftFilter('all')
    setRiskFilter('all')
    setDeviceFilter('all')
    setPage(1)
  }

  const exportCsv = () => {
    const header = ['工号', '姓名', '岗位', '班组', '班型', '风险等级', '风险分', '设备状态', '最近测评', '状态']
    const rows = filtered.map((employee) => [
      employee.employeeNo,
      employee.name,
      employee.job,
      employee.team,
      employee.shift,
      getRiskMeta(employee.riskLevel).label,
      employee.riskScore,
      DEVICE_LABELS[employee.deviceStatus],
      employee.lastAssessment,
      employee.status === 'active' ? '在职' : '停用',
    ])
    const csv = '﻿' + [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '员工名单_2026-11-09.csv'
    link.click()
    URL.revokeObjectURL(url)
    addToast({ title: '员工名单已导出', description: `共 ${filtered.length} 条记录，已记录导出操作。`, tone: 'success' })
  }

  const submitEmployee = () => {
    const nextErrors: Record<string, string> = {}
    if (form.name.trim().length < 2) nextErrors.name = '请输入至少 2 个字符的姓名'
    if (!form.employeeNo.trim()) nextErrors.employeeNo = '请输入工号'
    if (form.phone && !/^1[3-9]\d{9}$/.test(form.phone)) nextErrors.phone = '请输入有效的手机号'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    const success = addEmployee(form)
    if (success) {
      setModalOpen(false)
      setForm({ name: '', employeeNo: '', job: '化工操作员', team: TEAMS[0].name, shift: '白班', safetySensitive: true, phone: '', device: '' })
      setErrors({})
    }
  }

  return (
    <div className="employees-page">
      <PageHeader
        eyebrow="人员与档案"
        title="员工管理"
        description="维护员工档案、班组、班型、设备绑定与数据授权状态。"
        actions={
          <>
            <Button variant="secondary" icon={<Download size={15} />} onClick={exportCsv}>导出名单</Button>
            <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>新增员工</Button>
          </>
        }
      />

      <div className="employee-summary-strip">
        <div><span><Users size={16} /> 在职员工</span><strong>{activeCount}</strong><em>共 {employees.length} 人</em></div>
        <div><span>当前当班</span><strong>{employees.filter((employee) => employee.shift !== '休息' && employee.status === 'active').length}</strong><em>白班 + 夜班</em></div>
        <div><span>设备在线</span><strong>{onlineCount}</strong><em>{Math.round((onlineCount / Math.max(1, employees.length)) * 100)}% 在线率</em></div>
        <div><span>待首次测评</span><strong>{pendingCount}</strong><em>需要完成建档</em></div>
      </div>

      <Card className="employee-table-card">
        <div className="table-toolbar">
          <label className="search-input">
            <Search size={16} />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="搜索姓名或工号" aria-label="搜索姓名或工号" />
          </label>
          <select value={teamFilter} onChange={(event) => { setTeamFilter(event.target.value); setPage(1) }} aria-label="按班组筛选">
            <option value="all">全部班组</option>
            {TEAMS.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
          </select>
          <select value={shiftFilter} onChange={(event) => { setShiftFilter(event.target.value); setPage(1) }} aria-label="按班型筛选">
            <option value="all">全部班型</option>
            <option value="白班">白班</option>
            <option value="夜班">夜班</option>
            <option value="休息">休息</option>
          </select>
          <select value={riskFilter} onChange={(event) => { setRiskFilter(event.target.value as RiskLevel | 'all'); setPage(1) }} aria-label="按风险筛选">
            <option value="all">全部风险</option>
            <option value="low">低风险</option>
            <option value="attention">关注</option>
            <option value="high">高风险</option>
            <option value="severe">严重风险</option>
            <option value="pending">待评估</option>
          </select>
          <select value={deviceFilter} onChange={(event) => { setDeviceFilter(event.target.value); setPage(1) }} aria-label="按设备状态筛选">
            <option value="all">全部设备</option>
            <option value="connected">已连接</option>
            <option value="not_worn">未佩戴</option>
            <option value="offline">离线</option>
          </select>
          <button className="table-reset" onClick={resetFilters}>重置</button>
          <span className="table-count">{filtered.length} 名员工</span>
        </div>

        {pageItems.length ? (
          <div className="data-table-wrap">
            <table className="data-table employee-table">
              <thead>
                <tr>
                  <th>员工</th>
                  <th>岗位 / 班组</th>
                  <th>班型</th>
                  <th>设备</th>
                  <th>当前风险</th>
                  <th>最近测评</th>
                  <th>状态</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((employee) => (
                  <tr key={employee.id} className="clickable-row" onClick={() => navigate(`/admin/employees/${employee.id}`)}>
                    <td>
                      <div className="person-cell">
                        <Avatar name={employee.name} color={employee.avatarColor} size="sm" />
                        <div><strong>{employee.name}</strong><span>{employee.employeeNo}</span></div>
                      </div>
                    </td>
                    <td><div className="two-line"><strong>{employee.job}</strong><span>{employee.team}</span></div></td>
                    <td><span className={cn('shift-pill', employee.shift === '夜班' && 'is-night')}>{employee.shift}</span></td>
                    <td><div className="two-line"><strong className={cn(employee.deviceStatus === 'offline' && 'text-bad')}>{DEVICE_LABELS[employee.deviceStatus]}</strong><span>{employee.device}</span></div></td>
                    <td><div className="risk-cell"><RiskBadge level={employee.riskLevel} size="sm" /><strong>{employee.riskScore}</strong></div></td>
                    <td><span className="muted-text">{employee.lastAssessment}</span></td>
                    <td><span className={cn('employee-status', employee.status === 'active' ? 'is-active' : 'is-inactive')}>{employee.status === 'active' ? '在职' : '停用'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button onClick={(event) => { event.stopPropagation(); navigate(`/admin/employees/${employee.id}`) }}>查看</button>
                        <button onClick={(event) => { event.stopPropagation(); toggleEmployeeStatus(employee.id) }}>{employee.status === 'active' ? '停用' : '启用'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Search size={26} />}
            title="没有匹配的员工"
            description="尝试调整搜索关键字或筛选条件。"
            action={<Button variant="secondary" onClick={resetFilters}>清除筛选</Button>}
          />
        )}

        <div className="table-pagination">
          <span>第 {currentPage} / {totalPages} 页 · 每页 {PAGE_SIZE} 条</span>
          <div>
            <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="上一页"><ChevronLeft size={16} /></button>
            <button disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="下一页"><ChevronRight size={16} /></button>
          </div>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="新增员工"
        description="创建档案后，请通知员工完成数据授权与首次测评。"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button icon={<UserPlus size={15} />} onClick={submitEmployee}>创建档案</Button>
          </>
        }
      >
        <div className="employee-form">
          <FormField label="姓名" error={errors.name}>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="请输入员工姓名" />
          </FormField>
          <FormField label="工号" error={errors.employeeNo}>
            <input value={form.employeeNo} onChange={(event) => setForm({ ...form, employeeNo: event.target.value })} placeholder="例：E-1090" />
          </FormField>
          <FormField label="岗位">
            <select value={form.job} onChange={(event) => setForm({ ...form, job: event.target.value })}>
              {['化工操作员', '设备巡检员', '中控操作员', '装卸工', '质检员', '电工'].map((job) => <option key={job}>{job}</option>)}
            </select>
          </FormField>
          <FormField label="班组">
            <select value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })}>
              {TEAMS.map((team) => <option key={team.id}>{team.name}</option>)}
            </select>
          </FormField>
          <FormField label="班型">
            <select value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value as ShiftType })}>
              <option>白班</option>
              <option>夜班</option>
              <option>休息</option>
            </select>
          </FormField>
          <FormField label="手机号" error={errors.phone} hint="用于预警通知，可选">
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="11 位手机号" />
          </FormField>
          <FormField label="设备编号" hint="可稍后绑定">
            <input value={form.device} onChange={(event) => setForm({ ...form, device: event.target.value })} placeholder="例：FIT-8090" />
          </FormField>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.safetySensitive} onChange={(event) => setForm({ ...form, safetySensitive: event.target.checked })} />
            <span>该岗位为安全敏感岗位</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
