import { useState, useEffect } from 'react'
import { Printer, CheckCircle, AlertTriangle, ChevronDown, Activity, BarChart2, AlertCircle } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { getAttendanceSummary, submitAttendanceDispute, getMyDisputes } from '@/services/studentService'
import { getCourses } from '@/services/courseService'
import { useAuthStore } from '@/store/authStore'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AnimatedTitle } from '@/components/ui/AnimatedTitle'
import { Spinner } from '@/components/ui/Spinner'
import logoSrc from '@/assets/gaposa-logo.png'

const CARD = {
  background: '#fff',
  border: '1px solid #f1f5f9',
  borderRadius: 20,
  boxShadow: '0 2px 12px rgba(31,111,95,0.07)',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function groupByCourse(records, courseMap = {}) {
  const map = {}
  for (const rec of records) {
    const cid = rec.course_id || 'Unknown'
    if (!map[cid]) {
      const info = courseMap[cid]
      map[cid] = {
        courseId: cid,
        label: info ? `${info.code}${info.title ? ' — ' + info.title : ''}` : cid,
        code:  info?.code  || cid,
        title: info?.title || '',
        records: [], total: 0, present: 0, absent: 0,
      }
    }
    map[cid].records.push(rec)
    map[cid].total++
    if (rec.status === 'present' || rec.present) map[cid].present++
    else map[cid].absent++
  }
  return Object.values(map).map(c => ({
    ...c,
    pct:      c.total > 0 ? Math.round((c.present / c.total) * 100) : 0,
    eligible: c.total > 0 && Math.round((c.present / c.total) * 100) >= 75,
  })).sort((a, b) => a.code.localeCompare(b.code))
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

function letterhead(logoDataUrl) {
  return `
  <div style="display:flex;align-items:center;gap:22px;padding-bottom:18px;margin-bottom:24px;border-bottom:3px solid #1F6F5F">
    ${logoDataUrl ? `<img src="${logoDataUrl}" style="width:82px;height:82px;object-fit:contain" alt="Logo"/>` : ''}
    <div>
      <h1 style="margin:0;font-size:21px;font-weight:900;color:#1F6F5F;letter-spacing:-.01em;text-transform:uppercase">GATEWAY ICT POLYTECHNIC</h1>
      <p style="margin:3px 0 0;font-size:11px;color:#6b7280;font-weight:500">Saapade, Ogun State, Nigeria</p>
      <p style="margin:6px 0 0;font-size:12px;font-weight:800;color:#1e3a5f;letter-spacing:.02em">Department of Electrical / Electronics Engineering</p>
      <p style="margin:2px 0 0;font-size:11px;color:#2FA084;font-weight:700">EEE FACE-ID Attendance Management System</p>
    </div>
  </div>`
}

function studentMeta(studentName, matric, student) {
  const printed = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const fields = [
    ['Full Name',     studentName,                                   '1 / 2'],
    ['Matric Number', matric,                                         '2 / 3'],
    ['Department',    'Electrical / Electronics Engineering',         '1 / 2'],
    ['Option',        student?.option || '—',                         '2 / 3'],
    ['Level',         student?.level  || '—',                         '1 / 2'],
    ['Date Printed',  printed,                                         '2 / 3'],
  ]
  return `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 22px;margin-bottom:20px">
    <p style="margin:0 0 12px;font-size:10px;color:#1F6F5F;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding-bottom:10px;border-bottom:1px solid #e2e8f0">Student Information</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 28px">
      ${fields.map(([label, value]) => `
      <div>
        <p style="margin:0;font-size:9px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.1em">${label}</p>
        <p style="margin:3px 0 0;font-size:13px;font-weight:800;color:#111827">${value}</p>
      </div>`).join('')}
    </div>
  </div>`
}

function ThresholdBar({ pct }) {
  const color = pct >= 90 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626'
  const label = pct >= 90 ? 'Excellent — keep it up!' : pct >= 75 ? 'Minimum met — keep attending every class' : 'Below minimum — you must not miss any more classes'
  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.35rem' }}>
        <span>Attendance record</span><span>Target: 100%</span>
      </div>
      <div style={{ position: 'relative', height: 10, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, background: color, width: `${Math.min(pct,100)}%`, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.3rem' }}>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
        <span style={{ color, fontWeight: 600 }}>{label}</span>
      </div>
    </div>
  )
}

async function buildPrintCourse(course, studentName, matric, student) {
  const logoDataUrl = await getLogoDataUrl()
  const rows = course.records.map(r => `<tr>
    <td>${r.date||'—'}</td><td>Week ${r.week||'—'}</td><td>${r.semester||'—'}</td>
    <td style="color:${r.status==='present'?'#166534':'#991b1b'};font-weight:700">
      ${r.status?.charAt(0).toUpperCase()+r.status?.slice(1)||'—'}</td></tr>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attendance – ${course.code}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;padding:36px 44px;color:#111;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#1F6F5F;color:#fff;padding:10px 14px;text-align:left;font-size:11px;letter-spacing:.07em;text-transform:uppercase}
    td{padding:10px 14px;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even) td{background:#f9fafb}
    .summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
    .badge{display:inline-block;padding:4px 14px;border-radius:99px;font-size:11px;font-weight:800}
    .el{background:#dcfce7;color:#166534}.ar{background:#fee2e2;color:#991b1b}.warn{background:#fef9c3;color:#92400e}
    .stat{text-align:center}
    .stat-val{font-size:22px;font-weight:900;color:#1F6F5F;margin:0;line-height:1}
    .stat-lbl{font-size:9px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.09em;margin:3px 0 0}
    .divider{width:1px;height:40px;background:#e2e8f0}
    .foot{margin-top:32px;font-size:10px;color:#9ca3af;border-top:2px solid #1F6F5F;padding-top:12px;display:flex;justify-content:space-between}
    @media print{body{padding:24px 32px}}
  </style></head><body>
  ${letterhead(logoDataUrl)}
  <h2 style="margin:0 0 2px;font-size:15px;color:#1e3a5f;font-weight:900;text-transform:uppercase;letter-spacing:.03em">Attendance Report</h2>
  <p style="margin:0 0 18px;font-size:13px;color:#1F6F5F;font-weight:700">${course.code}${course.title ? ' — ' + course.title : ''}</p>
  ${studentMeta(studentName, matric, student)}
  <div class="summary">
    <div class="stat"><p class="stat-val">${course.total}</p><p class="stat-lbl">Total Classes</p></div>
    <div class="divider"></div>
    <div class="stat"><p class="stat-val" style="color:#16a34a">${course.present}</p><p class="stat-lbl">Present</p></div>
    <div class="divider"></div>
    <div class="stat"><p class="stat-val" style="color:#dc2626">${course.absent}</p><p class="stat-lbl">Absent</p></div>
    <div class="divider"></div>
    <div class="stat"><p class="stat-val" style="color:${course.pct>=75?'#16a34a':course.pct>=50?'#d97706':'#dc2626'}">${course.pct}%</p><p class="stat-lbl">Attendance</p></div>
    <div class="divider"></div>
    <div class="stat"><span class="badge ${course.pct>=90?'el':course.pct>=75?'warn':'ar'}">${course.pct>=90?'Excellent':course.pct>=75?'Needs Improvement':'Critical'}</span></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Week</th><th>Semester</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="foot">
    <span>Gateway ICT Polytechnic, Saapade · Electrical/Electronics Engineering Department</span>
    <span>EEE FACE-ID Attendance System</span>
  </div>
  </body></html>`
}

async function buildPrintAll(courses, studentName, matric, student) {
  const logoDataUrl = await getLogoDataUrl()
  const eligible = courses.filter(c => c.pct >= 90).length
  const atRisk   = courses.filter(c => c.total > 0 && c.pct < 90).length
  const rows = courses.map(c => `<tr>
    <td><strong style="color:#1e3a5f">${c.code}</strong>${c.title ? `<br><span style="font-size:11px;color:#6b7280">${c.title}</span>` : ''}</td>
    <td style="text-align:center">${c.total}</td>
    <td style="text-align:center;color:#16a34a;font-weight:700">${c.present}</td>
    <td style="text-align:center;color:#dc2626;font-weight:700">${c.absent}</td>
    <td style="text-align:center;font-weight:800;color:${c.pct>=75?'#16a34a':c.pct>=50?'#d97706':'#dc2626'}">${c.pct}%</td>
    <td><span style="padding:4px 12px;border-radius:99px;font-size:11px;font-weight:800;background:${c.pct>=90?'#dcfce7':c.pct>=75?'#fef9c3':'#fee2e2'};color:${c.pct>=90?'#166534':c.pct>=75?'#92400e':'#991b1b'}">${c.pct>=90?'Excellent':c.pct>=75?'Needs Improvement':'Critical'}</span></td>
  </tr>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Full Attendance Report</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;padding:36px 44px;color:#111;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#1F6F5F;color:#fff;padding:10px 14px;text-align:left;font-size:11px;letter-spacing:.07em;text-transform:uppercase}
    td{padding:10px 14px;border-bottom:1px solid #e5e7eb;vertical-align:top}
    tr:nth-child(even) td{background:#f9fafb}
    .overview{display:flex;gap:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px}
    .ov-cell{flex:1;padding:14px 18px;text-align:center;border-right:1px solid #e2e8f0}
    .ov-cell:last-child{border-right:none}
    .ov-val{font-size:24px;font-weight:900;margin:0;line-height:1}
    .ov-lbl{font-size:9px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin:4px 0 0}
    .foot{margin-top:32px;font-size:10px;color:#9ca3af;border-top:2px solid #1F6F5F;padding-top:12px;display:flex;justify-content:space-between}
    @media print{body{padding:24px 32px}}
  </style></head><body>
  ${letterhead(logoDataUrl)}
  <h2 style="margin:0 0 2px;font-size:15px;color:#1e3a5f;font-weight:900;text-transform:uppercase;letter-spacing:.03em">Full Attendance Report</h2>
  <p style="margin:0 0 18px;font-size:13px;color:#1F6F5F;font-weight:700">All Courses Summary</p>
  ${studentMeta(studentName, matric, student)}
  <div class="overview">
    <div class="ov-cell"><p class="ov-val" style="color:#2563eb">${courses.length}</p><p class="ov-lbl">Total Courses</p></div>
    <div class="ov-cell"><p class="ov-val" style="color:#16a34a">${eligible}</p><p class="ov-lbl">Excellent ≥90%</p></div>
    <div class="ov-cell"><p class="ov-val" style="color:#dc2626">${atRisk}</p><p class="ov-lbl">Need Attention</p></div>
  </div>
  <table>
    <thead><tr><th>Course</th><th style="text-align:center">Total</th><th style="text-align:center">Present</th><th style="text-align:center">Absent</th><th style="text-align:center">Attendance</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="foot">
    <span>Gateway ICT Polytechnic, Saapade · Electrical/Electronics Engineering Department</span>
    <span>EEE FACE-ID Attendance System</span>
  </div>
  </body></html>`
}

function openPrint(html, filename = 'attendance-report.html') {
  const printable = html.replace('</body>', `<script>window.onload=function(){window.print()}<\/script></body>`)
  const blob = new Blob([printable], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const w    = window.open(url, '_blank')
  if (!w) {
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export default function StudentAttendance() {
  const { profile } = useAuthStore()
  const location    = useLocation()
  const navState    = location.state || {}

  const matric      = profile?.matric || sessionStorage.getItem('studentMatric')
  const studentName = profile?.name   || sessionStorage.getItem('studentName') || 'Student'
  const firstName   = studentName.split(' ')[0]

  const [records,   setRecords]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState(navState.tab || 'course')
  const [selected,  setSelected]  = useState('')
  const [student,   setStudent]   = useState(null)
  const [courseMap, setCourseMap] = useState({})
  const [disputes,  setDisputes]  = useState([])
  const [disputeModal, setDisputeModal] = useState(null) // { rec, courseCode }
  const [disputeText,  setDisputeText]  = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [submitDone,   setSubmitDone]   = useState(false)

  useEffect(() => {
    if (!matric) return
    Promise.all([
      getAttendanceSummary(matric),
      supabase.from('students').select('level, option').eq('matric', matric).single(),
      getCourses(),
      getMyDisputes(matric),
    ]).then(([data, { data: sd }, courseList, myDisputes]) => {
      const map = {}
      ;(courseList || []).forEach(c => { map[c.id] = c })
      setCourseMap(map)
      const recs = data?.records || []
      setRecords(recs)
      const courses = groupByCourse(recs, map)
      if (courses.length) setSelected(courses[0].courseId)
      if (sd) setStudent(sd)
      setDisputes(myDisputes || [])
    }).finally(() => setLoading(false))
  }, [matric])

  async function handleSubmitDispute() {
    if (!disputeModal || !disputeText.trim()) return
    setSubmitting(true)
    try {
      await submitAttendanceDispute({
        matric,
        studentName:  studentName,
        attendanceId: disputeModal.rec.id,
        courseId:     disputeModal.rec.course_id,
        courseCode:   disputeModal.courseCode,
        week:         disputeModal.rec.week,
        date:         disputeModal.rec.date,
        description:  disputeText.trim(),
      })
      setSubmitDone(true)
      setDisputes(prev => [...prev, { attendance_id: disputeModal.rec.id, status: 'pending' }])
    } catch { /* silent */ }
    finally { setSubmitting(false) }
  }

  function getDisputeStatus(recId) {
    return disputes.find(d => d.attendance_id === recId)?.status || null
  }

  const courses = groupByCourse(records, courseMap)
  const course  = courses.find(c => c.courseId === selected)
  const hasData = courses.length > 0

  const TH = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.09em', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.06)' }
  const TD = { padding: '0.7rem 1rem', fontSize: '0.83rem', color: '#374151', borderBottom: '1px solid rgba(0,0,0,0.05)' }

  return (
    <StudentLayout>
      {/* ── Header ── */}
      <div style={{ marginBottom: '5.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ marginBottom: '0.25rem' }}>
              <AnimatedLabel text="Attendance" Icon={BarChart2} />
            </div>
            <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{studentName}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>{matric}</span>
            {student?.level && <span style={{ background: 'rgba(47,160,132,0.08)', color: '#2FA084', fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.6rem', borderRadius: 99, border: '1px solid rgba(47,160,132,0.22)' }}>{student.level}</span>}
            {student?.option && <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', fontWeight: 600, padding: '0.12rem 0.6rem', borderRadius: 99, border: '1px solid #e2e8f0' }}>{student.option}</span>}
          </div>
        </div>
      </div>

      {/* ── Tab switcher + Print (always visible) ── */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.4rem' }}>
        <div style={{ flex: 1, display: 'flex', gap: 5, background: '#e8edf0', border: '1px solid #e2e8f0', borderRadius: 16, padding: 5 }}>
          {[{ id: 'course', label: 'By Course' }, { id: 'all', label: 'All Courses' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '0.58rem', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s', fontFamily: 'inherit',
              background: tab === t.id ? '#1F6F5F' : 'transparent',
              color:      tab === t.id ? '#fff' : '#94a3b8',
              boxShadow:  tab === t.id ? '0 2px 10px rgba(31,111,95,0.25)' : 'none',
            }}>{t.label}</button>
          ))}
        </div>
        <button
          onClick={async () => {
            if (!hasData) { alert('No attendance records to print yet.'); return }
            if (tab === 'course' && course) openPrint(await buildPrintCourse(course, studentName, matric, student))
            else if (tab === 'all') openPrint(await buildPrintAll(courses, studentName, matric, student))
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '0.62rem 1.1rem',
            borderRadius: 13, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit',
            background: '#2FA084',
            color: '#fff',
            boxShadow: '0 2px 10px rgba(47,160,132,0.30)', transition: 'all 0.2s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1F6F5F'}
          onMouseLeave={e => e.currentTarget.style.background = '#2FA084'}
        >
          <Printer size={15} /> Print
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
          <Spinner size={32} color="white" />
        </div>
      ) : !hasData ? (
        <div style={{ ...CARD, padding: '4rem 2rem', textAlign: 'center' }}>
          <Activity size={42} color="#38bdf8" style={{ margin: '0 auto 1rem', filter: 'drop-shadow(0 2px 8px rgba(56,189,248,0.35))' }} />
          <p style={{ color: '#374151', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>No attendance records yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0.5rem 0 0', lineHeight: 1.6 }}>
            Records appear here once your lecturer marks attendance for your courses. <br />
            Check back after your next class.
          </p>
        </div>
      ) : tab === 'course' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Course dropdown */}
          <div style={{ position: 'relative' }}>
            <select value={selected} onChange={e => setSelected(e.target.value)} style={{
              width: '100%', appearance: 'none',
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.95)', borderRadius: 14,
              padding: '0.85rem 2.75rem 0.85rem 1.15rem',
              fontSize: '0.95rem', fontWeight: 700, color: '#1f2937', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}>
              {courses.map(c => <option key={c.courseId} value={c.courseId}>{c.label}</option>)}
            </select>
            <ChevronDown size={17} color="#6b7280" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {course && (
            <>
              {/* Stats card */}
              <div style={{ ...CARD, padding: '1.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                  <div>
                    <p style={{ color: '#1f2937', fontWeight: 800, fontSize: '1.1rem', margin: 0, fontFamily: "'Albert Sans', sans-serif", letterSpacing: '0.04em' }}>{course.label}</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '0.15rem 0 0', fontFamily: "'Albert Sans', sans-serif" }}>{course.total} class{course.total !== 1 ? 'es' : ''} recorded</p>
                  </div>
                  {course.pct >= 90
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '0.25rem 0.75rem', borderRadius: 99 }}><CheckCircle size={12} /> Excellent</span>
                    : course.pct >= 75
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, color: '#d97706', background: '#fef9c3', padding: '0.25rem 0.75rem', borderRadius: 99 }}><AlertTriangle size={12} /> Needs Improvement</span>
                    : <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '0.25rem 0.75rem', borderRadius: 99 }}><AlertTriangle size={12} /> Critical</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  {[
                    { label: 'Present', val: course.present, color: '#16a34a', bg: '#f0fdf4' },
                    { label: 'Absent',  val: course.absent,  color: '#dc2626', bg: '#fff1f2' },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} style={{ textAlign: 'center', background: bg, borderRadius: 12, padding: '0.75rem 0.5rem' }}>
                      <p style={{ color, fontSize: '1.6rem', fontWeight: 900, margin: 0, fontFamily: "'Albert Sans',sans-serif", lineHeight: 1 }}>{val}</p>
                      <p style={{ color, fontSize: '0.7rem', margin: '0.2rem 0 0', fontWeight: 600, opacity: 0.75 }}>{label}</p>
                    </div>
                  ))}
                </div>
                <ThresholdBar pct={course.pct} />
              </div>

              {/* Weekly heatmap */}
              <div style={{ ...CARD, padding: '1rem 1.4rem' }}>
                <p style={{ margin: '0 0 0.65rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Weekly Attendance</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {course.records.slice().sort((a, b) => (a.week||0) - (b.week||0)).map((rec, i) => {
                    const present = rec.status === 'present' || rec.present
                    return (
                      <div key={i} title={`Week ${rec.week} · ${rec.date || ''} · ${present ? 'Present' : 'Absent'}`}
                        style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, background: present ? '#dcfce7' : '#fee2e2', color: present ? '#16a34a' : '#dc2626', cursor: 'default', userSelect: 'none' }}>
                        {rec.week}
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: '#dcfce7', display: 'inline-block' }} /> Present
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: '#fee2e2', display: 'inline-block' }} /> Absent
                  </span>
                </div>
              </div>

              {/* Records table */}
              <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.4rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <p style={{ color: '#1f2937', fontWeight: 700, fontSize: '0.88rem', margin: 0, fontFamily: "'Albert Sans', sans-serif", letterSpacing: '0.03em' }}>Attendance Records — {course.code}</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Date','Week','Semester','Status',''].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {course.records.map((rec, i) => {
                        const present  = rec.status === 'present' || rec.present
                        const ds       = getDisputeStatus(rec.id)
                        return (
                          <tr key={i}>
                            <td style={TD}>{rec.date || '—'}</td>
                            <td style={TD}>Week {rec.week || '—'}</td>
                            <td style={{ ...TD, color: '#9ca3af', fontSize: '0.75rem' }}>{rec.semester || '—'}</td>
                            <td style={TD}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: 99, background: present ? '#dcfce7' : '#fee2e2', color: present ? '#16a34a' : '#dc2626' }}>
                                {present ? 'Present' : 'Absent'}
                              </span>
                            </td>
                            <td style={{ ...TD, textAlign: 'right' }}>
                              {!present && (
                                ds === 'approved'
                                  ? <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 99 }}>Corrected ✓</span>
                                  : ds === 'rejected'
                                  ? <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 99 }}>Dispute Rejected</span>
                                  : ds === 'pending'
                                  ? <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '2px 8px', borderRadius: 99 }}>Under Review…</span>
                                  : <button onClick={() => { setDisputeModal({ rec, courseCode: course.code }); setDisputeText(''); setSubmitDone(false) }}
                                      style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)', padding: '2px 8px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit' }}>
                                      Dispute
                                    </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* All courses */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.85rem' }}>
            {[
              { label: 'Total Courses',  val: courses.length,                                                              color: '#2563eb', bg: '#dbeafe' },
              { label: 'Excellent ≥90%', val: courses.filter(c => c.pct >= 90).length,                                    color: '#16a34a', bg: '#dcfce7' },
              { label: 'Need Attention', val: courses.filter(c => c.total > 0 && c.pct < 90).length,                      color: '#dc2626', bg: '#fee2e2' },
            ].map(({ label, val, color, bg }) => (
              <div key={label} style={{ ...CARD, textAlign: 'center', padding: '1.25rem 0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, margin: '0 auto 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                </div>
                <p style={{ color, fontSize: '2rem', fontWeight: 900, margin: 0, fontFamily: "'Albert Sans',sans-serif" }}>{val}</p>
                <p style={{ color: '#6b7280', fontSize: '0.72rem', margin: '0.3rem 0 0', fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.4rem', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: '#1f2937', fontWeight: 700, fontSize: '0.88rem', margin: 0, fontFamily: "'Albert Sans', sans-serif", letterSpacing: '0.03em' }}>
                {navState.filter === 'atrisk' ? 'At Risk Courses' : 'All Courses Summary'}
              </p>
              {navState.filter === 'atrisk' && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '0.18rem 0.65rem', borderRadius: 99 }}>
                  Below 75% only
                </span>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Course','Total','Present','Absent','%','Status'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {(navState.filter === 'atrisk' ? courses.filter(c => !c.eligible) : courses).map(c => (
                    <tr key={c.courseId} style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                      onClick={() => { setSelected(c.courseId); setTab('course') }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...TD, fontWeight: 700, color: '#1f2937' }}>{c.label}</td>
                      <td style={TD}>{c.total}</td>
                      <td style={{ ...TD, color: '#16a34a', fontWeight: 600 }}>{c.present}</td>
                      <td style={{ ...TD, color: '#dc2626', fontWeight: 600 }}>{c.absent}</td>
                      <td style={{ ...TD, fontWeight: 800, color: c.pct>=75?'#16a34a':c.pct>=50?'#d97706':'#dc2626' }}>{c.pct}%</td>
                      <td style={TD}>
                        {c.pct >= 90
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '0.18rem 0.6rem', borderRadius: 99 }}><CheckCircle size={10} /> Excellent</span>
                          : c.pct >= 75
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 700, color: '#d97706', background: '#fef9c3', padding: '0.18rem 0.6rem', borderRadius: 99 }}><AlertTriangle size={10} /> Improve</span>
                          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '0.18rem 0.6rem', borderRadius: 99 }}><AlertTriangle size={10} /> Critical</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ padding: '0.6rem 1.4rem', fontSize: '0.72rem', color: '#9ca3af', borderTop: '1px solid rgba(0,0,0,0.05)', margin: 0 }}>
              Click any row to view detailed records for that course.
            </p>
          </div>
        </div>
      )}
      {/* Dispute modal */}
      {disputeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: 420, borderRadius: 18, background: '#fff', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            {submitDone ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem' }}>
                  <CheckCircle size={24} color="#16a34a" />
                </div>
                <p style={{ margin: '0 0 0.35rem', fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>Dispute Submitted</p>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.55 }}>Your dispute has been sent to your lecturer for review. You'll be notified via Telegram when a decision is made.</p>
                <button onClick={() => setDisputeModal(null)}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: 10, border: 'none', background: '#2FA084', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>Dispute Attendance</p>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{disputeModal.courseCode} · Week {disputeModal.rec.week} · {disputeModal.rec.date}</p>
                  </div>
                  <button onClick={() => setDisputeModal(null)} style={{ padding: 5, borderRadius: 7, border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                    <AlertCircle size={14} />
                  </button>
                </div>
                <p style={{ margin: '0 0 0.65rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.55 }}>
                  You were marked <strong style={{ color: '#dc2626' }}>Absent</strong> for this class. If you were present, describe the situation and your lecturer will review it.
                </p>
                <textarea value={disputeText} onChange={e => setDisputeText(e.target.value)}
                  placeholder="Explain why you believe this record is incorrect…"
                  rows={4}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'inherit', color: '#1e293b', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '0.85rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setDisputeModal(null)}
                    style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button onClick={handleSubmitDispute} disabled={submitting || !disputeText.trim()}
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem', borderRadius: 10, border: 'none', background: submitting || !disputeText.trim() ? 'rgba(99,102,241,0.4)' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: submitting || !disputeText.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {submitting ? 'Submitting…' : 'Submit Dispute'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </StudentLayout>
  )
}
