import { useState, useEffect } from 'react'
import { LecturerLayout } from '@/components/layout/LecturerLayout'
import { useAuthStore } from '@/store/authStore'
import { getLecturerCourses } from '@/services/courseService'
import { getCourseAttendance, getEnrolledStudents } from '@/services/studentService'
import { getSettings } from '@/services/courseService'
import { Spinner } from '@/components/ui/Spinner'
import { normalizeLevel, levelFromCourseCode } from '@/utils'
import { Badge } from '@/components/ui/Badge'
import { Download, Filter, Search, CalendarCheck } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { formatTime } from '@/utils'

export default function AttendancePage() {
  const { profile }  = useAuthStore()
  const [courses,    setCourses]   = useState([])
  const [students,   setStudents]  = useState([])
  const [records,    setRecords]   = useState([])
  const [settings,   setSettings]  = useState({})
  const [loading,    setLoading]   = useState(true)
  const [activeTab,  setActiveTab] = useState('register') // 'register' | 'summary'
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedWeek,   setSelectedWeek]   = useState(1)
  const [search,         setSearch]         = useState('')

  useEffect(() => {
    Promise.all([getLecturerCourses(profile.id), getEnrolledStudents(), getSettings()])
      .then(([c, s, st]) => { setCourses(c); setStudents(s); setSettings(st); if (c.length) setSelectedCourse(c[0].id) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    getCourseAttendance(selectedCourse, selectedWeek, settings.semester || '')
      .then(setRecords)
  }, [selectedCourse, selectedWeek, settings.semester])

  const course = courses.find(c => c.id === selectedCourse)
  const presentCount = records.filter(r => r.status === 'present').length
  const absentCount  = records.filter(r => r.status === 'absent').length

  const courseLevel = course ? (levelFromCourseCode(course.code) || normalizeLevel(course.level)) : null
  const filteredStudents = students
    .filter(s => normalizeLevel(s.level) === normalizeLevel(courseLevel))
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.matric.toLowerCase().includes(search.toLowerCase()))

  function getRecord(matric) {
    return records.find(r => r.matric === matric)
  }

  if (loading) return <LecturerLayout><div className="flex justify-center py-16"><Spinner size={28} color="brand" /></div></LecturerLayout>

  return (
    <LecturerLayout>
      <div className="max-w-4xl mx-auto">
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <AnimatedLabel text="Attendance" Icon={CalendarCheck} />
          </div>
          <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{profile?.name || 'Lecturer'}</h1>
        </div>

        {/* Controls */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: '1rem', marginBottom: '1rem', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Course</label>
              <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white">
                {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Week</label>
              <select value={selectedWeek} onChange={e => setSelectedWeek(+e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white">
                {Array.from({ length: settings.totalWeeks || 15 }, (_, i) => (
                  <option key={i+1} value={i+1}>Week {i+1} of {settings.totalWeeks || 15}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-end">
              <div className="flex gap-3 items-center w-full">
                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Present: <span className="text-green-600 font-bold">{presentCount} ({filteredStudents.length ? Math.round(presentCount/filteredStudents.length*100) : 0}%)</span></span>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500 font-medium">Absent: <span className="text-red-600 font-bold">{absentCount}</span></span>
                </div>
                <button className="btn-secondary px-3 py-2 text-xs">
                  <Download size={14}/> Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#e8edf0', borderRadius: 12, padding: 4, marginBottom: '1rem', width: 'fit-content' }}>
          {[{ id: 'register', label: 'Register' }, { id: 'summary', label: 'Summary' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding: '0.45rem 1.1rem', borderRadius: 9, border: 'none', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', background: activeTab === t.id ? '#fff' : 'transparent', color: activeTab === t.id ? '#2FA084' : '#64748b', boxShadow: activeTab === t.id ? '0 2px 8px rgba(31,111,95,0.08)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input type="text" placeholder="Search by name or matric…"
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Matric</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Time In</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No students found</td></tr>
              )}
              {filteredStudents.map((s, i) => {
                const rec = getRecord(s.matric)
                return (
                  <tr key={s.matric} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{s.matric}</td>
                    <td className="px-4 py-3">
                      {rec ? <Badge status={rec.status} /> : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {rec ? formatTime(rec.markedAt) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400">Showing {filteredStudents.length} students</p>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-green-500" />Present</span>
              <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-red-500" />Absent</span>
              <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300" />Not held</span>
            </div>
          </div>
        </div>
      </div>
    </LecturerLayout>
  )
}
