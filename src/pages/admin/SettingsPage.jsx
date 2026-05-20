import { useState, useEffect } from 'react'
import { Save, Clock, Download, Settings } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { useAuthStore } from '@/store/authStore'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getSettings, updateSettings, getCourses } from '@/services/courseService'
import { getAllAttendanceWithDetails, getEnrolledStudents } from '@/services/studentService'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { SEMESTERS } from '@/utils'

const CARD = { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 18, boxShadow: '0 2px 12px rgba(31,111,95,0.07)', padding: '1.4rem 1.6rem' }
const LBL  = { fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.4rem', display: 'block' }
const INP  = { width: '100%', padding: '0.7rem 0.9rem', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: '0.88rem', color: '#1e293b', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', boxSizing: 'border-box', transition: 'border-color 0.2s' }

export default function SettingsPage() {
  const { profile } = useAuthStore()
  const [settings, setSettings] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const [courses, setCourses] = useState([])
  const [exportCourse, setExportCourse] = useState('all')
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([getSettings(), getCourses()])
      .then(([s, c]) => { setSettings(s); setCourses(c) })
  }, [])

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  async function handleSave() {
    setSaving(true)
    try {
      await updateSettings(settings)
      toast('Settings saved successfully', 'success')
    } catch {
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleExportCSV() {
    setExporting(true)
    try {
      const [records, students, allCourses] = await Promise.all([
        getAllAttendanceWithDetails(),
        getEnrolledStudents(),
        getCourses(),
      ])

      const courseMap = {}
      allCourses.forEach(c => { courseMap[c.id] = c })
      const studentMap = {}
      students.forEach(s => { studentMap[s.matric] = s })

      let filtered = records
      if (exportCourse !== 'all') filtered = records.filter(r => r.course_id === exportCourse)

      const rows = [
        ['Matric', 'Student Name', 'Level', 'Option', 'Course Code', 'Course Title', 'Date', 'Week', 'Semester', 'Status'],
        ...filtered.map(r => {
          const s = studentMap[r.matric] || {}
          const c = courseMap[r.course_id] || {}
          return [
            r.matric || '',
            s.name  || r.student_name || '',
            s.level || '',
            s.option || '',
            c.code  || '',
            c.title || '',
            r.date  || '',
            r.week  || '',
            r.semester || '',
            r.status || (r.present ? 'present' : 'absent'),
          ]
        }),
      ]

      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      const courseName = exportCourse === 'all' ? 'All-Courses' : (courseMap[exportCourse]?.code || exportCourse)
      a.download = `Attendance_${courseName}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast('CSV downloaded successfully', 'success')
    } catch (err) {
      toast('Export failed: ' + err.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  if (!settings) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner size={28} color="brand" />
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ marginBottom: '0.25rem' }}>
            <AnimatedLabel text="Settings" Icon={Settings} />
          </div>
          <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            {profile?.name || 'Administrator'}
          </h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.65rem 1.25rem', borderRadius: 12, border: 'none', background: saving ? '#94a3b8' : '#1F6F5F', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px rgba(31,111,95,0.25)', transition: 'all 0.2s' }}>
          {saving ? <Spinner size={14} /> : <Save size={14} />}
          Save Settings
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>

        {/* Academic Session */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', paddingBottom: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(47,160,132,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={15} color="#2FA084" />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>Academic Session</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={LBL}>Current Session</label>
              <input style={INP} type="text" value={settings.session || ''}
                onChange={e => set('session', e.target.value)} placeholder="e.g. 2024/2025"
                onFocus={e => e.target.style.borderColor = '#2FA084'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            <div>
              <label style={LBL}>Semester</label>
              <select style={INP} value={settings.semester || ''} onChange={e => set('semester', e.target.value)}>
                {SEMESTERS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Total Weeks in Semester</label>
              <input style={{ ...INP, maxWidth: 120 }} type="number" min={10} max={20}
                value={settings.total_weeks || settings.totalWeeks || 15}
                onChange={e => set('total_weeks', parseInt(e.target.value))} />
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>Used to calculate weekly attendance reports (typically 15–16).</p>
            </div>
          </div>
        </div>

        {/* Export Attendance Data */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', paddingBottom: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={15} color="#6366f1" />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>Export Attendance Data</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={LBL}>Filter by Course</label>
              <select style={INP} value={exportCourse} onChange={e => setExportCourse(e.target.value)}>
                <option value="all">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>CSV includes:</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.6 }}>
                Matric · Student Name · Level · Option · Course Code · Course Title · Date · Week · Semester · Status
              </p>
            </div>
            <button onClick={handleExportCSV} disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '0.78rem', borderRadius: 11, border: 'none', background: exporting ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: exporting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px rgba(99,102,241,0.25)', transition: 'all 0.2s' }}>
              {exporting ? <Spinner size={14} /> : <Download size={14} />}
              {exporting ? 'Generating…' : 'Download CSV'}
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
