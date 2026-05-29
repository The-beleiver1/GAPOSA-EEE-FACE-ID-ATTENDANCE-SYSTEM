import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, FileText } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getCourses, getLecturers, getSettings } from '@/services/courseService'
import { getAllAttendanceWithDetails, getEnrolledStudents } from '@/services/studentService'
import { Spinner } from '@/components/ui/Spinner'
import { normalizeLevel, levelFromCourseCode } from '@/utils'
import logoSrc from '@/assets/gaposa-logo.png'

async function getLogoDataUrl() {
  try {
    const res = await fetch(logoSrc); const blob = await res.blob()
    return new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(blob) })
  } catch { return '' }
}

function openPrint(html, filename = 'digest.html') {
  const printable = html.replace('</body>', `<script>window.onload=function(){window.print()}<\/script></body>`)
  const blob = new Blob([printable], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (!w) { const a = document.createElement('a'); a.href = url; a.download = filename; a.click() }
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

async function buildWeeklyDigest(stats, settings, attendance) {
  const logo = await getLogoDataUrl()
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  // Per-student overall attendance (all courses combined)
  const sMap = {}
  attendance.forEach(r => {
    if (!sMap[r.matric]) sMap[r.matric] = { matric: r.matric, name: r.name || r.student_name || r.matric, present: 0, total: 0 }
    sMap[r.matric].total++
    if (r.status === 'present' || r.present) sMap[r.matric].present++
  })
  const atRisk = Object.values(sMap)
    .map(s => ({ ...s, pct: s.total > 0 ? Math.round(s.present / s.total * 100) : 0 }))
    .filter(s => s.total >= 3 && s.pct < 80)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 20)

  const worstCourses = stats.courseStats.filter(c => c.rate !== null).slice(0, 8)

  const courseRows = worstCourses.map((c, i) => `<tr>
    <td style="color:#6b7280;text-align:center">${i+1}</td>
    <td><strong>${c.code}</strong>${c.title ? `<br><span style="font-size:10px;color:#9ca3af">${c.title}</span>` : ''}</td>
    <td style="text-align:center;font-weight:800;color:${c.rate>=75?'#16a34a':c.rate>=50?'#d97706':'#dc2626'}">${c.rate}%</td>
    <td style="text-align:center">${c.sessions}</td>
    <td style="text-align:center">${c.enrolled}</td>
    <td style="text-align:center"><span style="padding:2px 10px;border-radius:99px;font-size:10px;font-weight:800;
      background:${c.rate>=75?'#dcfce7':c.rate>=50?'#fef9c3':'#fee2e2'};
      color:${c.rate>=75?'#166534':c.rate>=50?'#92400e':'#991b1b'}">${c.rate>=75?'On Track':c.rate>=50?'Monitor':'Needs Action'}</span></td>
  </tr>`).join('')

  const riskRows = atRisk.map((s, i) => `<tr>
    <td style="color:#6b7280;text-align:center">${i+1}</td>
    <td style="font-weight:700">${s.name}</td>
    <td style="font-family:monospace;font-size:10px;color:#6b7280">${s.matric}</td>
    <td style="text-align:center">${s.present}</td>
    <td style="text-align:center">${s.total}</td>
    <td style="text-align:center;font-weight:800;color:${s.pct>=75?'#d97706':'#dc2626'}">${s.pct}%</td>
    <td><div style="height:6px;background:#f1f5f9;border-radius:99px;min-width:60px">
      <div style="height:100%;width:${s.pct}%;background:${s.pct>=75?'#d97706':'#dc2626'};border-radius:99px"></div>
    </div></td>
  </tr>`).join('')

  const absentRows = stats.chronicAbsent.map((s, i) => {
    const rate = Math.round(s.absent / s.total * 100)
    return `<tr>
      <td style="color:#6b7280;text-align:center">${i+1}</td>
      <td style="font-weight:700">${s.name}</td>
      <td style="font-family:monospace;font-size:10px;color:#6b7280">${s.matric}</td>
      <td style="text-align:center">${s.total}</td>
      <td style="text-align:center;color:#dc2626;font-weight:700">${s.absent}</td>
      <td style="text-align:center;font-weight:800;color:#dc2626">${rate}%</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>HOD Weekly Digest</title>
  <style>
    *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;padding:36px 44px;color:#111;font-size:12px}
    h2{font-size:13px;font-weight:800;color:#1e293b;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    th{background:#1F6F5F;color:#fff;padding:8px 12px;text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase}
    td{padding:7px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
    tr:nth-child(even) td{background:#f9fafb}
    .hdr{display:flex;align-items:center;gap:18px;padding-bottom:14px;margin-bottom:18px;border-bottom:3px solid #1F6F5F}
    .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
    .kpi-cell{border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;text-align:center}
    .kpi-val{font-size:22px;font-weight:900;margin:0;line-height:1}
    .kpi-lbl{font-size:9px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:3px 0 0}
    .foot{margin-top:24px;font-size:10px;color:#9ca3af;border-top:2px solid #1F6F5F;padding-top:10px;display:flex;justify-content:space-between}
    @media print{body{padding:24px 32px}}
  </style></head><body>
  <div class="hdr">
    ${logo ? `<img src="${logo}" style="width:64px;height:64px;object-fit:contain" alt="Logo"/>` : ''}
    <div>
      <h1 style="margin:0;font-size:17px;font-weight:900;color:#1F6F5F;text-transform:uppercase">GATEWAY ICT POLYTECHNIC</h1>
      <p style="margin:2px 0 0;font-size:10px;color:#6b7280">Saapade, Ogun State · Dept. of Electrical / Electronics Engineering</p>
      <p style="margin:4px 0 0;font-size:12px;font-weight:800;color:#1e3a5f">HOD WEEKLY ATTENDANCE DIGEST</p>
      <p style="margin:2px 0 0;font-size:10px;color:#2FA084">${settings.session || ''} · ${settings.semester || ''} · Generated ${date}</p>
    </div>
  </div>

  <div class="kpi">
    <div class="kpi-cell"><p class="kpi-val" style="color:${stats.overallRate>=75?'#16a34a':'#dc2626'}">${stats.overallRate}%</p><p class="kpi-lbl">Overall Attendance</p></div>
    <div class="kpi-cell"><p class="kpi-val" style="color:#2563eb">${stats.courseStats.length}</p><p class="kpi-lbl">Active Courses</p></div>
    <div class="kpi-cell"><p class="kpi-val" style="color:#dc2626">${atRisk.length}</p><p class="kpi-lbl">Students at Risk</p></div>
    <div class="kpi-cell"><p class="kpi-val" style="color:#dc2626">${stats.chronicAbsent.length}</p><p class="kpi-lbl">Chronic Absentees</p></div>
  </div>

  <h2>Course Attendance Ranking (worst first)</h2>
  ${worstCourses.length === 0 ? '<p style="color:#9ca3af;font-size:11px">No course data recorded yet.</p>' : `
  <table><thead><tr><th>#</th><th>Course</th><th style="text-align:center">Attendance</th><th style="text-align:center">Sessions</th><th style="text-align:center">Enrolled</th><th style="text-align:center">Status</th></tr></thead>
  <tbody>${courseRows}</tbody></table>`}

  <h2>Students at Risk — Approaching Disqualification (below 80%)</h2>
  ${atRisk.length === 0 ? '<p style="color:#9ca3af;font-size:11px">No students currently at risk. Maintain current attendance levels.</p>' : `
  <table><thead><tr><th>#</th><th>Student</th><th>Matric</th><th style="text-align:center">Present</th><th style="text-align:center">Total</th><th style="text-align:center">Rate</th><th>Progress</th></tr></thead>
  <tbody>${riskRows}</tbody></table>
  <p style="font-size:10px;color:#9ca3af;margin:4px 0 0">Sorted by lowest attendance first. Immediate intervention recommended for students below 75%.</p>`}

  <h2>Chronically Absent Students (absent ≥50% of recorded classes)</h2>
  ${stats.chronicAbsent.length === 0 ? '<p style="color:#9ca3af;font-size:11px">No chronically absent students this period.</p>' : `
  <table><thead><tr><th>#</th><th>Student</th><th>Matric</th><th style="text-align:center">Total</th><th style="text-align:center">Absent</th><th style="text-align:center">Absence Rate</th></tr></thead>
  <tbody>${absentRows}</tbody></table>`}

  <div class="foot">
    <span>EEE FACE-ID Attendance System · Gateway ICT Polytechnic</span>
    <span>Printed: ${date}</span>
  </div>
  </body></html>`
}

export default function HODAnalyticsPage() {
  const [loading,    setLoading]    = useState(true)
  const [attendance, setAttendance] = useState([])
  const [courses,    setCourses]    = useState([])
  const [students,   setStudents]   = useState([])
  const [lecturers,  setLecturers]  = useState([])
  const [settings,   setSettings]   = useState({})
  const [printing,   setPrinting]   = useState(false)

  useEffect(() => {
    Promise.all([getAllAttendanceWithDetails(), getCourses(), getEnrolledStudents(), getLecturers(), getSettings()])
      .then(([att, c, s, l, st]) => { setAttendance(att); setCourses(c); setStudents(s); setLecturers(l); setSettings(st) })
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    // Per-course attendance rates
    const courseStats = courses.map(c => {
      const recs     = attendance.filter(r => r.course_id === c.id)
      const present  = recs.filter(r => r.status === 'present' || r.present).length
      const total    = recs.length
      const rate     = total > 0 ? Math.round(present / total * 100) : null
      const cl       = levelFromCourseCode(c.code) || normalizeLevel(c.level)
      const enrolled = students.filter(s => normalizeLevel(s.level) === normalizeLevel(cl)).length
      const sessions = [...new Set(recs.map(r => `${r.week}__${r.date}`))].length
      return { ...c, present, total, rate, enrolled, sessions }
    }).filter(c => c.total > 0).sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101))

    // Per-student chronic absenteeism (absent in ≥50% of all their records)
    const studentMap = {}
    attendance.forEach(r => {
      if (!studentMap[r.matric]) studentMap[r.matric] = { matric: r.matric, name: r.name || r.student_name || r.matric, total: 0, absent: 0 }
      studentMap[r.matric].total++
      if (r.status !== 'present' && !r.present) studentMap[r.matric].absent++
    })
    const chronicAbsent = Object.values(studentMap)
      .filter(s => s.total >= 3 && s.absent / s.total >= 0.5)
      .sort((a, b) => (b.absent / b.total) - (a.absent / a.total))
      .slice(0, 15)

    // Per-lecturer activity
    const lecturerMap = {}
    attendance.forEach(r => {
      if (!r.lecturer_id) return
      if (!lecturerMap[r.lecturer_id]) lecturerMap[r.lecturer_id] = { id: r.lecturer_id, sessions: new Set(), records: 0 }
      lecturerMap[r.lecturer_id].sessions.add(`${r.course_id}__${r.week}`)
      lecturerMap[r.lecturer_id].records++
    })
    const lecturerActivity = lecturers.map(l => ({
      ...l,
      sessions: lecturerMap[l.id]?.sessions.size || 0,
      records:  lecturerMap[l.id]?.records || 0,
    })).sort((a, b) => b.sessions - a.sessions)

    const overallRate = attendance.length > 0
      ? Math.round(attendance.filter(r => r.status === 'present' || r.present).length / attendance.length * 100)
      : 0

    return { courseStats, chronicAbsent, lecturerActivity, overallRate }
  }, [attendance, courses, students, lecturers])

  const CARD = { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, boxShadow: '0 2px 12px rgba(31,111,95,0.07)', padding: '1rem 1.25rem' }

  return (
    <AdminLayout>
      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ marginBottom: '0.25rem' }}><AnimatedLabel text="HOD Analytics" Icon={TrendingUp} /></div>
            <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 }}>Department Analytics</h1>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>{settings.session} · {settings.semester}</p>
          </div>
          <button
            disabled={printing || loading}
            onClick={async () => {
              setPrinting(true)
              try { openPrint(await buildWeeklyDigest(stats, settings, attendance), 'hod-weekly-digest.html') }
              finally { setPrinting(false) }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', borderRadius: 10, border: 'none', background: printing || loading ? '#94a3b8' : '#1F6F5F', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: printing || loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            {printing ? <Spinner size={13} color="white" /> : <FileText size={13} />}
            {printing ? 'Preparing…' : 'Weekly Digest'}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={28} color="brand" /></div>
        ) : (<>

          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
            {[
              { label: 'Dept. Attendance',  val: `${stats.overallRate}%`, color: stats.overallRate >= 75 ? '#16a34a' : '#dc2626' },
              { label: 'Courses Active',    val: stats.courseStats.length,  color: '#2563eb' },
              { label: 'Chronic Absentees', val: stats.chronicAbsent.length, color: '#dc2626' },
              { label: 'Total Records',     val: attendance.length,         color: '#6366f1' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ ...CARD, textAlign: 'center', padding: '0.85rem' }}>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1 }}>{val}</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Course attendance ranking */}
            <div style={CARD}>
              <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Course Attendance Ranking</h2>
              {stats.courseStats.length === 0
                ? <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem 0' }}>No data yet</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {stats.courseStats.map(c => (
                      <div key={c.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>{c.code}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: c.rate >= 75 ? '#16a34a' : c.rate >= 50 ? '#d97706' : '#dc2626' }}>{c.rate}%</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${c.rate}%`, background: c.rate >= 75 ? '#2FA084' : c.rate >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 99, transition: 'width 0.5s' }} />
                        </div>
                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.62rem', color: '#94a3b8' }}>{c.sessions} sessions · {c.enrolled} enrolled</p>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Lecturer activity */}
            <div style={CARD}>
              <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Lecturer Activity</h2>
              {stats.lecturerActivity.length === 0
                ? <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem 0' }}>No lecturers assigned</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {stats.lecturerActivity.map(l => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(47,160,132,0.08)', border: '1.5px solid rgba(47,160,132,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, color: '#2FA084', flexShrink: 0 }}>
                          {(l.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</p>
                          <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8' }}>{l.sessions} sessions · {l.records} records</p>
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: l.sessions > 0 ? '#2FA084' : '#94a3b8', background: l.sessions > 0 ? 'rgba(47,160,132,0.08)' : '#f8fafc', padding: '2px 8px', borderRadius: 99 }}>
                          {l.sessions > 0 ? 'Active' : 'No scans'}
                        </span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* Chronically absent students */}
          <div style={CARD}>
            <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
              Chronically Absent Students <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>(absent ≥50% of their records)</span>
            </h2>
            {stats.chronicAbsent.length === 0
              ? <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem 0' }}>No chronically absent students — great!</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      {['Student', 'Matric', 'Total Classes', 'Absent', 'Absence Rate'].map(h => (
                        <th key={h} style={{ padding: '0.55rem 0.85rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {stats.chronicAbsent.map(s => {
                        const absentRate = Math.round(s.absent / s.total * 100)
                        return (
                          <tr key={s.matric} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{s.name}</td>
                            <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{s.matric}</td>
                            <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#64748b' }}>{s.total}</td>
                            <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>{s.absent}</td>
                            <td style={{ padding: '0.6rem 0.85rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                                  <div style={{ height: '100%', width: `${absentRate}%`, background: '#ef4444', borderRadius: 99 }} />
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626', flexShrink: 0 }}>{absentRate}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </>)}
      </div>
    </AdminLayout>
  )
}
