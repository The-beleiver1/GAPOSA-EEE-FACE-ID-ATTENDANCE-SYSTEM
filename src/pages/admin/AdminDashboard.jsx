import { useState, useEffect, useMemo } from 'react'
import { Users, BookOpen, AlertTriangle, BarChart2, LayoutDashboard } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { useAuthStore } from '@/store/authStore'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/Spinner'
import { getEnrolledStudents, getAllAttendanceWithDetails } from '@/services/studentService'
import { getCourses, getSettings } from '@/services/courseService'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

export default function AdminDashboard() {
  const { profile } = useAuthStore()
  const [loading,    setLoading]    = useState(true)
  const [students,   setStudents]   = useState([])
  const [courses,    setCourses]    = useState([])
  const [settings,   setSettings]   = useState({})
  const [attendance, setAttendance] = useState([])
  const [selCourse,  setSelCourse]  = useState('all')

  useEffect(() => {
    Promise.all([getEnrolledStudents(), getCourses(), getSettings(), getAllAttendanceWithDetails()])
      .then(([s, c, st, att]) => { setStudents(s); setCourses(c); setSettings(st); setAttendance(att) })
      .finally(() => setLoading(false))
  }, [])

  /* ── Derived stats (re-compute when filter changes) ── */
  const filtered = useMemo(() =>
    selCourse === 'all' ? attendance : attendance.filter(r => r.course_id === selCourse),
  [attendance, selCourse])

  const stats = useMemo(() => {
    const present = filtered.filter(r => r.status === 'present' || r.present === true).length
    const late    = filtered.filter(r => r.status === 'late').length
    const absent  = filtered.length - present - late

    // Per-student attendance rate
    const perStudent = {}
    filtered.forEach(r => {
      if (!perStudent[r.matric]) perStudent[r.matric] = { total: 0, present: 0 }
      perStudent[r.matric].total++
      if (r.status === 'present' || r.present === true) perStudent[r.matric].present++
    })
    const below75 = Object.values(perStudent).filter(s => s.total > 0 && s.present / s.total < 0.75).length

    // Most recent week's scans
    const maxWeek = filtered.length ? Math.max(...filtered.map(r => r.week || 0)) : 0
    const scansThisWeek = filtered.filter(r => r.week === maxWeek).length

    // Pie
    const total = filtered.length
    const pieData = total > 0 ? [
      { name: 'Present', value: Math.round(present / total * 100), color: '#22c55e' },
      { name: 'Absent',  value: Math.round(absent  / total * 100), color: '#ef4444' },
      { name: 'Late',    value: Math.round(late     / total * 100), color: '#f59e0b' },
    ] : [
      { name: 'Present', value: 0, color: '#22c55e' },
      { name: 'Absent',  value: 0, color: '#ef4444' },
      { name: 'Late',    value: 0, color: '#f59e0b' },
    ]
    const avgPct = total > 0 ? Math.round(present / total * 100) : 0

    // Weekly data
    const weekMap = {}
    filtered.forEach(r => {
      const w = r.week || 1
      if (!weekMap[w]) weekMap[w] = { week: `W${w}`, present: 0, absent: 0 }
      if (r.status === 'present' || r.present === true) weekMap[w].present++
      else weekMap[w].absent++
    })
    const weeklyData = Object.values(weekMap).sort((a, b) => parseInt(a.week.slice(1)) - parseInt(b.week.slice(1)))

    return { present, late, absent, below75, scansThisWeek, pieData, avgPct, weeklyData }
  }, [filtered])

  const levelCounts = ['ND I', 'ND II', 'HND I', 'HND II'].map(lvl => ({
    level: lvl, count: students.filter(s => s.level === lvl).length,
  }))

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><Spinner size={32} color="brand" /></div></AdminLayout>

  return (
    <AdminLayout>
      {/* Header + filters */}
      <div className="flex items-center justify-between mb-6" style={{ flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <div style={{ marginBottom: '0.25rem' }}>
            <AnimatedLabel text="Dashboard" Icon={LayoutDashboard} />
          </div>
          <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            {profile?.name || 'Administrator'}
          </h1>
        </div>
        <div className="flex gap-3" style={{ flexWrap:'wrap' }}>
          <select className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white font-medium text-gray-600">
            <option>{settings.session} {settings.semester}</option>
          </select>
          <select
            value={selCourse}
            onChange={e => setSelCourse(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white font-medium text-gray-600">
            <option value="all">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Enrolled Students" value={students.length}          sub="View Details" accent="blue"   icon={Users} />
        <StatCard label="Active Courses"           value={courses.length}           sub="View Courses" accent="green"  icon={BookOpen} />
        <StatCard label="Below 75% Attendance"     value={stats.below75}            sub="View Students" accent="red"   icon={AlertTriangle} />
        <StatCard label="Scans This Week"          value={stats.scansThisWeek}      sub={stats.scansThisWeek ? `Week ${Math.max(...filtered.map(r=>r.week||0))}` : 'No data yet'} accent="purple" icon={BarChart2} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Students by level */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700">Students by Level</h3>
            <button className="text-xs text-brand-600 font-semibold">View All</button>
          </div>
          {students.length === 0 ? (
            <p style={{ fontSize:'0.78rem', color:'#94a3b8', textAlign:'center', padding:'1rem 0' }}>No students enrolled yet</p>
          ) : (
            <div className="space-y-3">
              {levelCounts.map(({ level, count }) => (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600">{level}</span>
                    <span className="text-xs font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${students.length ? (count / students.length) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance pie */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-1">Attendance Overview</h3>
          <p className="text-xs text-gray-400 mb-2">
            {selCourse === 'all' ? 'All courses' : courses.find(c=>c.id===selCourse)?.code} · {filtered.length} records
          </p>
          {filtered.length === 0 ? (
            <p style={{ fontSize:'0.78rem', color:'#94a3b8', textAlign:'center', padding:'2.5rem 0' }}>No attendance data yet</p>
          ) : (
            <>
              <div className="flex items-center justify-center">
                <PieChart width={180} height={180}>
                  <Pie data={stats.pieData} cx={90} cy={90} innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {stats.pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <text x={90} y={90}  textAnchor="middle" dominantBaseline="middle" fontSize={18} fontWeight={700} fill="#111827">{stats.avgPct}%</text>
                  <text x={90} y={108} textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize={10}>Average</text>
                </PieChart>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {stats.pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-gray-500">{d.name} {d.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Week trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">Week by Week Trend</h3>
          </div>
          {stats.weeklyData.length === 0 ? (
            <p style={{ fontSize:'0.78rem', color:'#94a3b8', textAlign:'center', padding:'2.5rem 0' }}>No attendance data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={stats.weeklyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2FA084" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2FA084" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Area type="monotone" dataKey="present" stroke="#2FA084" fill="url(#presentGrad)" strokeWidth={2} dot={false} name="Present" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="card">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Weekly Attendance Overview</h3>
        {stats.weeklyData.length === 0 ? (
          <p style={{ fontSize:'0.82rem', color:'#94a3b8', textAlign:'center', padding:'2.5rem 0' }}>No attendance records yet. Start scanning to see data here.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weeklyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="present" fill="#22c55e" radius={[4,4,0,0]} name="Present" />
              <Bar dataKey="absent"  fill="#ef4444" radius={[4,4,0,0]} name="Absent" />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </AdminLayout>
  )
}
