import { useState, useEffect } from 'react'
import { BarChart3, Download, Printer } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { LecturerLayout } from '@/components/layout/LecturerLayout'
import { useAuthStore } from '@/store/authStore'
import { getLecturerCourses, getSettings } from '@/services/courseService'
import { getCourseAttendance, getEnrolledStudents, notifyStudentWarning } from '@/services/studentService'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import logoSrc from '@/assets/gaposa-logo.png'

function WeekBar({ week, present, total }) {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
      <span style={{ width: 48, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>Wk {week}</span>
      <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 75 ? '#2FA084' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 5, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ width: 36, fontSize: '0.7rem', fontWeight: 700, color: '#475569', textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
    </div>
  )
}

async function getLogoDataUrl() {
  try {
    const res  = await fetch(logoSrc)
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return '' }
}

function exportCSV(course, studentSummary, weeklyData, settings) {
  const rows = [
    ['Course Code', 'Course Title', 'Session', 'Semester'],
    [course.code, course.title || '', settings.session || '', settings.semester || ''],
    [],
    ['Matric', 'Student Name', 'Level', 'Option', 'Classes Attended', 'Total Classes', 'Attendance %', 'Status'],
    ...studentSummary.map(s => [
      s.matric, s.name, s.level || '', s.option || '',
      s.presentCount, s.total,
      s.rate !== null ? s.rate + '%' : '—',
      s.rate !== null ? (s.rate >= 75 ? 'Eligible' : 'At Risk') : 'No Data',
    ]),
    [],
    ['Weekly Summary'],
    ['Week', 'Present', 'Total', 'Attendance %'],
    ...weeklyData.map(w => [w.week, w.present, w.total, w.total > 0 ? Math.round(w.present / w.total * 100) + '%' : '—']),
  ]
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `ClassRegister_${course.code}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function printClassRegister(course, studentSummary, weeklyData, settings, lecturerName) {
  const logoDataUrl = await getLogoDataUrl()
  const printed = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const totalPresent = studentSummary.reduce((a, s) => a + s.presentCount, 0)
  const totalClasses = weeklyData.length

  const studentRows = studentSummary.map((s, i) => `
    <tr>
      <td style="text-align:center;color:#6b7280">${i + 1}</td>
      <td style="font-family:monospace;font-size:11px">${s.matric}</td>
      <td><strong>${s.name}</strong></td>
      <td style="text-align:center">${s.presentCount}</td>
      <td style="text-align:center">${s.total}</td>
      <td style="text-align:center;font-weight:800;color:${s.rate >= 75 ? '#16a34a' : s.rate >= 50 ? '#d97706' : '#dc2626'}">${s.rate !== null ? s.rate + '%' : '—'}</td>
      <td style="text-align:center"><span style="padding:2px 10px;border-radius:99px;font-size:10px;font-weight:800;background:${s.rate >= 75 ? '#dcfce7' : s.rate !== null ? '#fee2e2' : '#f1f5f9'};color:${s.rate >= 75 ? '#166534' : s.rate !== null ? '#991b1b' : '#94a3b8'}">${s.rate !== null ? (s.rate >= 75 ? '✓ Eligible' : '✗ At Risk') : 'No Data'}</span></td>
    </tr>`).join('')

  const weekRows = weeklyData.map(w => {
    const pct = w.total > 0 ? Math.round(w.present / w.total * 100) : 0
    return `<tr>
      <td style="text-align:center">Week ${w.week}</td>
      <td style="text-align:center">${w.present}</td>
      <td style="text-align:center">${w.total}</td>
      <td style="text-align:center;font-weight:800;color:${pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'}">${pct}%</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Class Register — ${course.code}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;padding:36px 44px;color:#111;font-size:12px}
    h2{margin:0 0 2px;font-size:15px;font-weight:900;color:#1e3a5f;text-transform:uppercase;letter-spacing:.03em}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#1F6F5F;color:#fff;padding:8px 12px;text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase}
    td{padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
    tr:nth-child(even) td{background:#f9fafb}
    .meta{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
    .meta-item p{margin:0;font-size:9px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.1em}
    .meta-item h4{margin:3px 0 0;font-size:13px;font-weight:800;color:#111827}
    .section-title{margin:20px 0 4px;font-size:12px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.06em;padding-bottom:6px;border-bottom:2px solid #1F6F5F}
    .foot{margin-top:28px;font-size:10px;color:#9ca3af;border-top:2px solid #1F6F5F;padding-top:10px;display:flex;justify-content:space-between}
    @media print{body{padding:20px 28px}}
  </style></head><body>
  <!-- Letterhead -->
  <div style="display:flex;align-items:center;gap:20px;padding-bottom:16px;margin-bottom:20px;border-bottom:3px solid #1F6F5F">
    ${logoDataUrl ? `<img src="${logoDataUrl}" style="width:72px;height:72px;object-fit:contain" alt="Logo"/>` : ''}
    <div>
      <h1 style="margin:0;font-size:19px;font-weight:900;color:#1F6F5F;text-transform:uppercase">GATEWAY ICT POLYTECHNIC</h1>
      <p style="margin:2px 0 0;font-size:10px;color:#6b7280">Saapade, Ogun State, Nigeria</p>
      <p style="margin:5px 0 0;font-size:11px;font-weight:800;color:#1e3a5f">Department of Electrical / Electronics Engineering</p>
      <p style="margin:2px 0 0;font-size:10px;color:#2FA084;font-weight:700">EEE FACE-ID Attendance Management System</p>
    </div>
  </div>

  <h2>Class Attendance Register</h2>
  <p style="margin:0 0 14px;font-size:13px;color:#1F6F5F;font-weight:700">${course.code}${course.title ? ' — ' + course.title : ''}</p>

  <div class="meta">
    <div class="meta-item"><p>Lecturer</p><h4>${lecturerName}</h4></div>
    <div class="meta-item"><p>Session</p><h4>${settings.session || '—'}</h4></div>
    <div class="meta-item"><p>Semester</p><h4>${settings.semester || '—'}</h4></div>
    <div class="meta-item"><p>Total Students</p><h4>${studentSummary.length}</h4></div>
    <div class="meta-item"><p>Classes Held</p><h4>${totalClasses}</h4></div>
    <div class="meta-item"><p>Date Printed</p><h4>${printed}</h4></div>
  </div>

  <p class="section-title">Student Attendance Summary</p>
  <table>
    <thead><tr><th>#</th><th>Matric</th><th>Student Name</th><th style="text-align:center">Present</th><th style="text-align:center">Total</th><th style="text-align:center">%</th><th style="text-align:center">Status</th></tr></thead>
    <tbody>${studentRows}</tbody>
  </table>

  <p class="section-title" style="margin-top:24px">Weekly Breakdown</p>
  <table style="max-width:380px">
    <thead><tr><th>Week</th><th style="text-align:center">Present</th><th style="text-align:center">Total</th><th style="text-align:center">Rate</th></tr></thead>
    <tbody>${weekRows}</tbody>
  </table>

  <div class="foot">
    <span>Gateway ICT Polytechnic, Saapade · Electrical/Electronics Engineering Department</span>
    <span>EEE FACE-ID Attendance System</span>
  </div>
  </body></html>`

  const printable = html.replace('</body>', `<script>window.onload=function(){window.print()}<\/script></body>`)
  const blob = new Blob([printable], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const w    = window.open(url, '_blank')
  if (!w) {
    const a = document.createElement('a')
    a.href = url; a.download = 'class-register.html'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export default function LecturerReportsPage() {
  const { profile } = useAuthStore()
  const { toast } = useToast()
  const [courses,        setCourses]        = useState([])
  const [students,       setStudents]       = useState([])
  const [settings,       setSettings]       = useState({})
  const [selectedCourse, setSelectedCourse] = useState('')
  const [records,        setRecords]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [printing,       setPrinting]       = useState(false)
  const [activeTab,      setActiveTab]      = useState('summary')
  const [warningSending, setWarningSending] = useState({})
  const [warningSent,    setWarningSent]    = useState({})

  useEffect(() => {
    Promise.all([getLecturerCourses(profile.id), getEnrolledStudents(), getSettings()])
      .then(([c, s, st]) => { setCourses(c); setStudents(s); setSettings(st); if (c.length) setSelectedCourse(c[0].id) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    setWarningSent({})
    setLoadingRecords(true)
    getCourseAttendance(selectedCourse).then(setRecords).finally(() => setLoadingRecords(false))
  }, [selectedCourse])

  const course        = courses.find(c => c.id === selectedCourse)
  const totalWeeks    = settings.total_weeks || settings.totalWeeks || 15
  const courseStudents = students.filter(s => s.level === course?.level)

  const weeklyData = Array.from({ length: totalWeeks }, (_, i) => {
    const week = i + 1
    const weekRecords = records.filter(r => r.week === week)
    const present = weekRecords.filter(r => r.status === 'present' || r.present).length
    return { week, present, total: weekRecords.length }
  }).filter(w => w.total > 0)

  const totalPresent = records.filter(r => r.status === 'present' || r.present).length
  const totalRecords = records.length
  const overallRate  = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0

  const studentSummary = courseStudents.map(s => {
    const sr = records.filter(r => r.matric === s.matric)
    const presentCount = sr.filter(r => r.status === 'present' || r.present).length
    return { ...s, presentCount, total: sr.length, rate: sr.length > 0 ? Math.round((presentCount / sr.length) * 100) : null }
  }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))

  // Group records by date+week for session view
  const sessionGroups = {}
  for (const r of records) {
    const key = `${r.date || ''}__${r.week || ''}`
    if (!sessionGroups[key]) sessionGroups[key] = { date: r.date, week: r.week, records: [] }
    sessionGroups[key].records.push(r)
  }
  const sessions = Object.values(sessionGroups).sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  async function handlePrint() {
    setPrinting(true)
    try { await printClassRegister(course, studentSummary, weeklyData, settings, profile?.name || 'Lecturer') }
    finally { setPrinting(false) }
  }

  async function handleSendWarning(s) {
    const key = `${s.matric}_${selectedCourse}`
    setWarningSending(p => ({ ...p, [key]: true }))
    try {
      await notifyStudentWarning(s.matric, {
        name:       s.name,
        courseCode: course.code,
        courseId:   selectedCourse,
        semester:   settings.semester || '',
        session:    settings.session  || '',
      })
      setWarningSent(p => ({ ...p, [key]: true }))
      toast(`Warning letter sent to ${s.name}`, 'success')
    } catch {
      toast('Failed to send warning letter', 'error')
    } finally {
      setWarningSending(p => ({ ...p, [key]: false }))
    }
  }

  const CARD = { background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(31,111,95,0.07)', padding: '1rem 1.25rem' }

  if (loading) return (
    <LecturerLayout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner size={28} color="brand" />
      </div>
    </LecturerLayout>
  )

  return (
    <LecturerLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.65rem' }}>
          <div>
            <div style={{ marginBottom: '0.25rem' }}>
              <AnimatedLabel text="Reports" Icon={BarChart3} />
            </div>
            <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              {profile?.name || 'Lecturer'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {courses.length > 0 && (
              <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                style={{ padding: '0.48rem 0.85rem', fontSize: '0.8rem', border: '1.5px solid #e2e8f0', borderRadius: 10, outline: 'none', fontFamily: 'inherit', color: '#334155', background: '#fff', fontWeight: 600 }}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title || 'Course'}</option>)}
              </select>
            )}
            {courses.length > 0 && course && (
              <>
                <button onClick={() => exportCSV(course, studentSummary, weeklyData, settings)} disabled={loadingRecords}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.48rem 0.9rem', borderRadius: 10, border: '1.5px solid #6366f1', background: '#fff', color: '#6366f1', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Download size={13} /> CSV
                </button>
                <button onClick={handlePrint} disabled={printing || loadingRecords}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.48rem 0.9rem', borderRadius: 10, border: 'none', background: '#1F6F5F', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: printing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {printing ? <Spinner size={12} /> : <Printer size={13} />} Print Register
                </button>
              </>
            )}
          </div>
        </div>

        {courses.length === 0 ? (
          <div style={{ ...CARD, padding: '3rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>No courses assigned yet.</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
              {[
                { label: 'Overall Rate',  value: `${overallRate}%`,                                  color: overallRate >= 75 ? '#2FA084' : overallRate >= 50 ? '#f59e0b' : '#ef4444' },
                { label: 'Total Present', value: totalPresent,                                        color: '#16a34a' },
                { label: 'Total Absent',  value: Math.max(0, totalRecords - totalPresent),            color: '#dc2626' },
                { label: 'Classes Held',  value: weeklyData.length,                                   color: '#6366f1' },
              ].map(stat => (
                <div key={stat.label} style={CARD}>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '1.35rem', fontWeight: 800, color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: '0.85rem', width: 'fit-content' }}>
              {[['summary', 'Summary'], ['sessions', 'By Session'], ['students', 'All Students']].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ padding: '0.42rem 0.9rem', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === id ? '#fff' : 'transparent', color: activeTab === id ? '#1F6F5F' : '#94a3b8', boxShadow: activeTab === id ? '0 1px 6px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.18s' }}>
                  {label}
                </button>
              ))}
            </div>

            {loadingRecords ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner size={24} color="brand" /></div>
            ) : activeTab === 'summary' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Weekly breakdown */}
                <div style={CARD}>
                  <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Weekly Attendance Rate</h2>
                  {weeklyData.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>No records yet</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {weeklyData.map(w => <WeekBar key={w.week} {...w} />)}
                    </div>
                  )}
                </div>
                {/* Student breakdown */}
                <div style={CARD}>
                  <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                    Student Summary <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>({courseStudents.length})</span>
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 320, overflowY: 'auto' }}>
                    {studentSummary.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>No students at this level</p>
                    ) : studentSummary.map(s => (
                      <div key={s.matric} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(47,160,132,0.08)', border: '1.5px solid rgba(47,160,132,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#2FA084', flexShrink: 0 }}>
                          {s.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                          <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8' }}>{s.matric}</p>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: s.rate === null ? '#cbd5e1' : s.rate >= 75 ? '#2FA084' : s.rate >= 50 ? '#f59e0b' : '#ef4444', flexShrink: 0 }}>
                          {s.rate !== null ? s.rate + '%' : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'sessions' ? (
              <div style={CARD}>
                <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Sessions ({sessions.length})</h2>
                {sessions.length === 0 ? (
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>No sessions recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {sessions.map(s => {
                      const present = s.records.filter(r => r.status === 'present' || r.present).length
                      const pct = s.records.length > 0 ? Math.round(present / s.records.length * 100) : 0
                      return (
                        <div key={s.date + s.week} style={{ border: '1px solid #f1f5f9', borderRadius: 12, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e293b' }}>{s.date || 'Unknown date'}</span>
                              {s.week && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.08)', padding: '0.15rem 0.55rem', borderRadius: 99 }}>Week {s.week}</span>}
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }}>
                              {present}/{s.records.length} present ({pct}%)
                            </span>
                          </div>
                          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                                  {['Matric', 'Student', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '0.45rem 0.85rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {s.records.map((r, i) => (
                                  <tr key={i} style={{ borderTop: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>{r.matric}</td>
                                    <td style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>{r.student_name || '—'}</td>
                                    <td style={{ padding: '0.45rem 0.85rem' }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.18rem 0.6rem', borderRadius: 99, background: (r.status === 'present' || r.present) ? '#dcfce7' : '#fee2e2', color: (r.status === 'present' || r.present) ? '#16a34a' : '#dc2626' }}>
                                        {(r.status === 'present' || r.present) ? 'Present' : 'Absent'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* All students full table */
              <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>All Students — Full Attendance</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                        {['#', 'Matric', 'Student Name', 'Level', 'Present', 'Absent', '%', 'Status'].map(h => (
                          <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentSummary.map((s, i) => (
                        <tr key={s.matric} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', color: '#9ca3af' }}>{i + 1}</td>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#6b7280' }}>{s.matric}</td>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{s.name}</td>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', color: '#6b7280' }}>{s.level || '—'}</td>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', fontWeight: 700, color: '#16a34a' }}>{s.presentCount}</td>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>{Math.max(0, s.total - s.presentCount)}</td>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', fontWeight: 800, color: s.rate === null ? '#94a3b8' : s.rate >= 75 ? '#16a34a' : s.rate >= 50 ? '#d97706' : '#dc2626' }}>
                            {s.rate !== null ? s.rate + '%' : '—'}
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            {s.rate !== null ? (
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: 99, background: s.rate >= 75 ? '#dcfce7' : '#fee2e2', color: s.rate >= 75 ? '#166534' : '#991b1b' }}>
                                {s.rate >= 75 ? '✓ Eligible' : '✗ At Risk'}
                              </span>
                            ) : <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>No Data</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {studentSummary.length === 0 && (
                  <p style={{ margin: 0, padding: '2.5rem', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>No students found for this course level.</p>
                )}
              </div>
            )}

            {/* At-risk banner */}
            {activeTab === 'summary' && studentSummary.filter(s => s.rate !== null && s.rate < 75).length > 0 && (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(239,68,68,0.22)', padding: '1rem 1.25rem', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#dc2626' }}>
                    At-Risk Students — Below 75%
                  </h2>
                  <button
                    onClick={async () => {
                      const atRisk = studentSummary.filter(s => s.rate !== null && s.rate < 75)
                      for (const s of atRisk) {
                        const key = `${s.matric}_${selectedCourse}`
                        if (!warningSent[key]) await handleSendWarning(s)
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.32rem 0.8rem', borderRadius: 7, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', color: '#dc2626', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                    Send All Warnings
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {studentSummary.filter(s => s.rate !== null && s.rate < 75).map(s => {
                    const key     = `${s.matric}_${selectedCourse}`
                    const sending = warningSending[key]
                    const sent    = warningSent[key]
                    return (
                      <div key={s.matric} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.45rem 0.75rem', background: '#fef2f2', borderRadius: 9, border: '1px solid #fecaca' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace', flexShrink: 0 }}>{s.matric}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', flexShrink: 0 }}>{s.rate}%</span>
                        </div>
                        <button
                          onClick={() => handleSendWarning(s)}
                          disabled={sending || sent}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.65rem', borderRadius: 6, border: sent ? '1px solid #bbf7d0' : '1px solid rgba(220,38,38,0.3)', background: sent ? '#f0fdf4' : 'rgba(220,38,38,0.06)', color: sent ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: '0.65rem', cursor: sending || sent ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: sending ? 0.6 : 1, transition: 'all 0.2s' }}>
                          {sending ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10, animation: 'spin 1s linear infinite' }}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
                          ) : sent ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                          )}
                          {sending ? 'Sending…' : sent ? 'Sent' : 'Send Warning'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </LecturerLayout>
  )
}
