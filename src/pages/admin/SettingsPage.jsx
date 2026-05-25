import { useState, useEffect } from 'react'
import { Save, Clock, Download, Settings, Archive, Trash2, AlertTriangle, History, FileJson, FileText } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { useAuthStore } from '@/store/authStore'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getSettings, updateSettings, getCourses } from '@/services/courseService'
import { getAllAttendanceWithDetails, getEnrolledStudents, getAllAbsenceRequests, clearSessionData, saveSessionArchive, getSessionArchives, getSessionArchiveData, deleteSessionArchive, getMasterList } from '@/services/studentService'
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
  const [exporting,      setExporting]      = useState(false)
  const [courses,        setCourses]        = useState([])
  const [exportCourse,   setExportCourse]   = useState('all')
  const [archiving,      setArchiving]      = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearing,       setClearing]       = useState(false)
  const [clearConfirm,   setClearConfirm]   = useState('')
  const [archives,       setArchives]       = useState([])
  const [selArchiveId,   setSelArchiveId]   = useState('')
  const [redownloading,    setRedownloading]    = useState(false)
  const [pdfLoading,       setPdfLoading]       = useState(false)
  const [deletingArchive,  setDeletingArchive]  = useState(false)
  const [deleteConfirmId,  setDeleteConfirmId]  = useState(null)
  const [selArchiveData,   setSelArchiveData]   = useState(null)
  const [selArchiveLoading,setSelArchiveLoading]= useState(false)
  const [pdfLevel,         setPdfLevel]         = useState('all')
  const [pdfCourse,        setPdfCourse]        = useState('all')
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([getSettings(), getCourses(), getSessionArchives()])
      .then(([s, c, a]) => { setSettings(s); setCourses(c); setArchives(a) })
  }, [])

  useEffect(() => {
    if (!selArchiveId) { setSelArchiveData(null); setPdfLevel('all'); setPdfCourse('all'); return }
    setSelArchiveLoading(true); setPdfLevel('all'); setPdfCourse('all')
    getSessionArchiveData(selArchiveId)
      .then(setSelArchiveData)
      .catch(() => {})
      .finally(() => setSelArchiveLoading(false))
  }, [selArchiveId])

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

  async function handleArchive() {
    setArchiving(true)
    try {
      const [records, students, absences, allCourses] = await Promise.all([
        getAllAttendanceWithDetails(),
        getEnrolledStudents(),
        getAllAbsenceRequests(),
        getCourses(),
      ])
      const courseMap = {}
      allCourses.forEach(c => { courseMap[c.id] = c })
      const studentMap = {}
      students.forEach(s => { studentMap[s.matric] = s })

      const backup = {
        exported_at:      new Date().toISOString(),
        session:          settings.session  || '',
        semester:         settings.semester || '',
        total_students:   students.length,
        total_attendance: records.length,
        courses: allCourses,
        students: students.map(s => ({
          matric: s.matric, name: s.name, level: s.level,
          option: s.option, email: s.email, email_verified: s.email_verified,
        })),
        attendance: records.map(r => ({
          matric:       r.matric,
          student_name: studentMap[r.matric]?.name || r.name || r.student_name || '',
          level:        studentMap[r.matric]?.level  || '',
          option:       studentMap[r.matric]?.option || '',
          course_code:  courseMap[r.course_id]?.code  || '',
          course_title: courseMap[r.course_id]?.title || '',
          date:         r.date,
          week:         r.week,
          semester:     r.semester,
          status:       r.status,
        })),
        absence_requests: absences,
      }

      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `EEE-FACEID_${(settings.session || 'Session').replace('/', '-')}_${settings.semester?.replace(/\s/g,'-') || 'Sem'}_${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      // Also save to cloud (non-blocking — local download already succeeded)
      try {
        await saveSessionArchive(backup)
        const updated = await getSessionArchives()
        setArchives(updated)
        toast('Session backup downloaded & saved to cloud', 'success')
      } catch {
        toast('Session backup downloaded (cloud save failed — check DB setup)', 'success')
      }
    } catch (err) {
      toast('Backup failed: ' + err.message, 'error')
    } finally { setArchiving(false) }
  }

  async function handleRedownload() {
    if (!selArchiveId) return
    setRedownloading(true)
    try {
      const archive = await getSessionArchiveData(selArchiveId)
      const json = JSON.stringify(archive.data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `EEE-FACEID_${(archive.session || 'Session').replace('/', '-')}_${(archive.semester || 'Sem').replace(/\s/g,'-')}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('Archive downloaded', 'success')
    } catch (err) {
      toast('Download failed: ' + err.message, 'error')
    } finally { setRedownloading(false) }
  }

  async function handleDownloadPDF() {
    if (!selArchiveData) return
    setPdfLoading(true)
    try {
      const d = selArchiveData.data
      const LEVEL_ORDER = ['ND I', 'ND II', 'HND I', 'HND II']
      const rateClass = r => r >= 75 ? 'rate-good' : r >= 50 ? 'rate-warn' : 'rate-bad'

      // Build per-course attendance stats
      const courseStats = {}
      ;(d.courses || []).forEach(c => { courseStats[c.code] = { code: c.code, title: c.title || '', students: {} } })
      ;(d.attendance || []).forEach(r => {
        const code = r.course_code || 'Unknown'
        if (!courseStats[code]) courseStats[code] = { code, title: r.course_title || '', students: {} }
        if (!courseStats[code].students[r.matric]) {
          courseStats[code].students[r.matric] = { matric: r.matric, name: r.student_name || '', level: r.level || '', present: 0, absent: 0, total: 0 }
        }
        const st = courseStats[code].students[r.matric]
        st.total++
        if (r.status === 'present') st.present++
        else st.absent++
      })
      // Merge accurate names & levels from archive's students array
      ;(d.students || []).forEach(s => {
        Object.values(courseStats).forEach(c => {
          if (c.students[s.matric]) {
            if (s.name)  c.students[s.matric].name  = s.name
            if (s.level) c.students[s.matric].level = s.level
          }
        })
      })

      // Fallback: enrich still-blank names/levels from live master_list
      // (needed when archive was saved with 0 students enrolled)
      try {
        const masterList = await getMasterList()
        const masterMap = {}
        masterList.forEach(s => { masterMap[String(s.matric).trim()] = s })
        Object.values(courseStats).forEach(c => {
          Object.values(c.students).forEach(st => {
            if (!st.name || !st.level) {
              const ml = masterMap[String(st.matric).trim()]
              if (ml) { if (!st.name) st.name = ml.name || ''; if (!st.level) st.level = ml.level || '' }
            }
          })
        })
      } catch { /* master_list enrichment is best-effort */ }

      // Apply level filter — remove students not matching selected level
      if (pdfLevel !== 'all') {
        Object.values(courseStats).forEach(c => {
          Object.keys(c.students).forEach(matric => {
            if (c.students[matric].level !== pdfLevel) delete c.students[matric]
          })
        })
      }

      // Apply course filter — only keep selected course
      const visibleCourses = pdfCourse === 'all'
        ? Object.values(courseStats)
        : Object.values(courseStats).filter(c => c.code === pdfCourse)

      const sortStudents = rows => [...rows].sort((a, b) => {
        const li = LEVEL_ORDER.indexOf(a.level); const lj = LEVEL_ORDER.indexOf(b.level)
        if (li !== lj) return (li < 0 ? 99 : li) - (lj < 0 ? 99 : lj)
        return (a.name || '').localeCompare(b.name || '')
      })

      const courseHTML = visibleCourses.map(c => {
        const rows = sortStudents(Object.values(c.students))
        if (!rows.length) return `<div class="course-section"><div class="section-header">${c.code}${c.title ? ' — ' + c.title : ''}</div><p class="empty-msg">No attendance records for this filter combination.</p></div>`
        const totP = rows.reduce((s, r) => s + r.present, 0)
        const totT = rows.reduce((s, r) => s + r.total, 0)
        const avg  = totT > 0 ? Math.round(totP / totT * 100) : 0
        return `<div class="course-section">
          <div class="section-header">${c.code}${c.title ? ' — ' + c.title : ''}</div>
          <table>
            <thead><tr><th>#</th><th>Matric No.</th><th>Student Name</th><th>Level</th><th>Present</th><th>Absent</th><th>Total</th><th>Rate</th></tr></thead>
            <tbody>
              ${rows.map((r, i) => { const rate = r.total > 0 ? Math.round(r.present / r.total * 100) : 0; return `<tr><td>${i+1}</td><td>${r.matric}</td><td>${r.name}</td><td>${r.level || '—'}</td><td class="present">${r.present}</td><td class="absent">${r.absent}</td><td>${r.total}</td><td class="${rateClass(rate)}">${rate}%</td></tr>` }).join('')}
              <tr class="total-row"><td colspan="4" style="text-align:right">Course Average</td><td class="present">${totP}</td><td class="absent">${totT - totP}</td><td>${totT}</td><td class="${rateClass(avg)}">${avg}%</td></tr>
            </tbody>
          </table></div>`
      }).join('')

      const allStudents = (d.students || []).filter(s => pdfLevel === 'all' || s.level === pdfLevel)
      const studentRows = sortStudents(allStudents)
      const levelCounts = LEVEL_ORDER.map(lvl => ({ lvl, count: studentRows.filter(s => s.level === lvl).length })).filter(x => x.count > 0)

      const filterLabel = [
        pdfLevel !== 'all' ? pdfLevel : 'All Levels',
        pdfCourse !== 'all' ? pdfCourse : 'All Courses',
      ].join(' · ')

      // Load logo same way as MasterListPage
      let logoDataUrl = ''
      try {
        const { default: logoSrc } = await import('@/assets/gaposa-logo.png')
        const res  = await fetch(logoSrc)
        const blob = await res.blob()
        logoDataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob) })
      } catch { /* skip logo if unavailable */ }

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Attendance Report — ${d.session} ${d.semester} — ${filterLabel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;font-size:11px}
.page{padding:36px 40px;max-width:960px;margin:0 auto}
.letterhead{display:flex;align-items:center;gap:18px;padding-bottom:16px;border-bottom:3px solid #1F6F5F;margin-bottom:20px}
.lh-text h1{margin:0;font-size:19px;font-weight:900;color:#1F6F5F;text-transform:uppercase}
.lh-text p{margin:2px 0 0;font-size:10px;color:#6b7280}
.lh-right{margin-left:auto;text-align:right;font-size:10px;color:#6b7280;line-height:1.6}
.report-title{font-size:19px;font-weight:900;color:#0f172a;margin-bottom:3px}
.report-sub{font-size:11px;color:#64748b;margin-bottom:16px}
.stats-row{display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap}
.stat-box{flex:1;min-width:110px;background:#f0faf7;border:1px solid #c6e4dc;border-radius:8px;padding:9px 13px}
.stat-box .val{font-size:21px;font-weight:900;color:#1F6F5F}
.stat-box .lbl{font-size:9px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:.06em}
.section-header{background:#1F6F5F;color:#fff;padding:6px 13px;font-size:11px;font-weight:800;margin:20px 0 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em}
.level-grid{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.level-chip{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:5px 12px;font-size:10px}
.level-chip strong{color:#1e293b;font-size:13px;display:block}
table{width:100%;border-collapse:collapse;margin-bottom:4px}
th{background:#f0faf7;color:#1F6F5F;font-weight:700;padding:6px 8px;text-align:left;border:1px solid #c6e4dc;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em}
td{padding:5px 8px;border:1px solid #e2eaf2;vertical-align:middle}
tr:nth-child(even) td{background:#f9fbff}
.present{color:#16a34a;font-weight:700}
.absent{color:#dc2626}
.rate-good{color:#16a34a;font-weight:800}
.rate-warn{color:#d97706;font-weight:800}
.rate-bad{color:#dc2626;font-weight:800}
.total-row td{background:#f0faf7!important;font-weight:700;border-top:2px solid #c6e4dc}
.course-section{margin-bottom:10px}
.empty-msg{color:#94a3b8;font-style:italic;padding:8px 0;font-size:10px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.course-section{page-break-inside:avoid}}
</style></head><body><div class="page">
<div class="letterhead">
  ${logoDataUrl ? `<img src="${logoDataUrl}" style="width:72px;height:72px;object-fit:contain" alt="Logo"/>` : ''}
  <div class="lh-text">
    <h1>GATEWAY ICT POLYTECHNIC</h1>
    <p>Saapade, Ogun State, Nigeria</p>
    <p style="margin-top:5px;font-size:11px;font-weight:800;color:#1e3a5f">Department of Electrical / Electronics Engineering</p>
    <p style="font-size:10px;color:#2FA084;font-weight:700">EEE FACE-ID Attendance Management System</p>
  </div>
  <div class="lh-right">
    <div><strong>${d.session || ''}</strong> Academic Session</div>
    <div>${d.semester || ''}</div>
    <div>Generated: ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</div>
  </div>
</div>

<div class="report-title">Attendance Report</div>
<div class="report-sub">${d.session || ''} · ${d.semester || ''} · ${filterLabel}</div>

<div class="stats-row">
  <div class="stat-box"><div class="val">${d.total_students || 0}</div><div class="lbl">Students Enrolled</div></div>
  <div class="stat-box"><div class="val">${d.total_attendance || 0}</div><div class="lbl">Attendance Records</div></div>
  <div class="stat-box"><div class="val">${(d.courses || []).length}</div><div class="lbl">Courses</div></div>
  <div class="stat-box"><div class="val">${(d.absence_requests || []).length}</div><div class="lbl">Absence Requests</div></div>
</div>

${levelCounts.length ? `<div class="section-header">Students by Level</div>
<div class="level-grid">${levelCounts.map(x => `<div class="level-chip"><strong>${x.count}</strong>${x.lvl}</div>`).join('')}</div>` : ''}

${studentRows.length ? `<div class="section-header">Enrolled Students</div>
<table><thead><tr><th>#</th><th>Matric No.</th><th>Name</th><th>Level</th><th>Option</th></tr></thead>
<tbody>${studentRows.map((s, i) => `<tr><td>${i+1}</td><td>${s.matric}</td><td>${s.name}</td><td>${s.level || '—'}</td><td>${s.option || '—'}</td></tr>`).join('')}</tbody></table>` : ''}

<div class="section-header" style="margin-top:24px">Attendance by Course</div>
${courseHTML}
</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const w    = window.open(url, '_blank')
      if (!w) { const a = document.createElement('a'); a.href = url; a.download = `EEE-Report_${(d.session||'').replace('/','_')}_${(d.semester||'').replace(/\s/g,'_')}.html`; document.body.appendChild(a); a.click(); document.body.removeChild(a) }
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      toast('Report opened — use Print › Save as PDF', 'success')
    } catch (err) {
      toast('PDF failed: ' + err.message, 'error')
    } finally { setPdfLoading(false) }
  }

  async function handleDeleteArchive() {
    if (!deleteConfirmId) return
    setDeletingArchive(true)
    try {
      await deleteSessionArchive(deleteConfirmId)
      setArchives(prev => prev.filter(a => a.id !== deleteConfirmId))
      if (selArchiveId === deleteConfirmId) setSelArchiveId('')
      setDeleteConfirmId(null)
      toast('Archive deleted', 'success')
    } catch (err) {
      toast('Delete failed: ' + err.message, 'error')
    } finally { setDeletingArchive(false) }
  }

  async function handleClearSession() {
    setClearing(true)
    try {
      await clearSessionData()
      toast('All session data cleared successfully', 'success')
      setShowClearModal(false)
      setClearConfirm('')
    } catch (err) {
      toast('Clear failed: ' + err.message, 'error')
    } finally { setClearing(false) }
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
      {/* Clear confirm modal */}
      {showClearModal && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}>
          <div style={{ width:'92vw', maxWidth:420, background:'#fff', borderRadius:18, boxShadow:'0 24px 80px rgba(0,0,0,0.25)', padding:'1.75rem 1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
              <div style={{ width:46, height:46, borderRadius:'50%', background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#dc2626' }}>
                <AlertTriangle size={22}/>
              </div>
              <div>
                <p style={{ margin:0, fontWeight:800, fontSize:'0.97rem', color:'#0f172a' }}>Clear All Session Data</p>
                <p style={{ margin:'0.15rem 0 0', fontSize:'0.75rem', color:'#dc2626', fontWeight:600 }}>This action is permanent and cannot be undone</p>
              </div>
            </div>
            <p style={{ margin:'0 0 1rem', fontSize:'0.82rem', color:'#64748b', lineHeight:1.65 }}>
              This will permanently delete <strong>all students, face enrollments, attendance records, absence requests</strong>, and student photos. Download a backup first.
            </p>
            <div style={{ marginBottom:'1rem' }}>
              <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>
                Type <strong style={{ color:'#dc2626' }}>CLEAR</strong> to confirm
              </label>
              <input value={clearConfirm} onChange={e=>setClearConfirm(e.target.value)}
                placeholder="CLEAR"
                style={{ width:'100%', padding:'0.7rem 0.9rem', borderRadius:10, border:`1.5px solid ${clearConfirm==='CLEAR'?'#dc2626':'#e2e8f0'}`, fontSize:'0.9rem', fontWeight:700, color:'#dc2626', outline:'none', fontFamily:'inherit', boxSizing:'border-box', letterSpacing:'0.1em' }}/>
            </div>
            <div style={{ display:'flex', gap:'0.65rem' }}>
              <button onClick={()=>{ setShowClearModal(false); setClearConfirm('') }} disabled={clearing}
                style={{ flex:1, padding:'0.72rem', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={handleClearSession} disabled={clearConfirm !== 'CLEAR' || clearing}
                style={{ flex:1, padding:'0.72rem', borderRadius:10, border:'none', background:clearConfirm==='CLEAR'&&!clearing?'#dc2626':'rgba(239,68,68,0.3)', color:'#fff', fontWeight:700, fontSize:'0.85rem', cursor:clearConfirm==='CLEAR'&&!clearing?'pointer':'not-allowed', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                {clearing ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.5)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }}/> Clearing…</> : <><Trash2 size={14}/> Clear All Data</>}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button onClick={handleExportCSV} disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '0.78rem', borderRadius: 11, border: 'none', background: exporting ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: exporting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px rgba(99,102,241,0.25)', transition: 'all 0.2s' }}>
              {exporting ? <Spinner size={14} /> : <Download size={14} />}
              {exporting ? 'Generating…' : 'Download CSV'}
            </button>
          </div>
        </div>

        {/* Session Backup */}
        <div style={CARD}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem', paddingBottom:'0.9rem', borderBottom:'1px solid #f1f5f9' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'rgba(31,111,95,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Archive size={15} color="#1F6F5F" />
            </div>
            <h3 style={{ margin:0, fontSize:'0.88rem', fontWeight:800, color:'#1e293b' }}>Session Backup</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            <p style={{ margin:0, fontSize:'0.8rem', color:'#64748b', lineHeight:1.55 }}>
              Downloads a full backup — students, attendance history, face data, and absence requests. Save before clearing session data.
            </p>
            <button onClick={handleArchive} disabled={archiving}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'0.78rem', borderRadius:11, border:'none', background:archiving?'#94a3b8':'linear-gradient(135deg,#1F6F5F,#2FA084)', color:'#fff', fontWeight:700, fontSize:'0.88rem', cursor:archiving?'not-allowed':'pointer', fontFamily:'inherit', boxShadow:'0 2px 10px rgba(31,111,95,0.25)', transition:'all 0.2s' }}>
              {archiving ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }}/> Building backup…</> : <><Archive size={14}/> Download Session Backup</>}
            </button>
          </div>
        </div>

        {/* Previous Sessions */}
        <div style={CARD}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem', paddingBottom:'0.9rem', borderBottom:'1px solid #f1f5f9' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'rgba(99,102,241,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <History size={15} color="#6366f1" />
            </div>
            <h3 style={{ margin:0, fontSize:'0.88rem', fontWeight:800, color:'#1e293b' }}>Previous Sessions</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            {archives.length === 0 ? (
              <p style={{ margin:0, fontSize:'0.8rem', color:'#94a3b8', textAlign:'center', padding:'1.5rem 0' }}>
                No saved sessions yet. Download a backup to save one here.
              </p>
            ) : (<>
              {/* Step 1 — Academic Session & Semester */}
              <div>
                <label style={LBL}>Academic Session &amp; Semester</label>
                <select
                  style={INP}
                  value={selArchiveId}
                  onChange={e => { setSelArchiveId(e.target.value); setDeleteConfirmId(null) }}>
                  <option value="">Choose a session…</option>
                  {archives.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.session} · {a.semester}
                    </option>
                  ))}
                </select>
              </div>

              {/* Session info box */}
              {selArchiveId && (() => {
                const a = archives.find(x => x.id === selArchiveId)
                if (!a) return null
                return (
                  <div style={{ background:'#f8fafc', borderRadius:10, padding:'0.85rem 1rem', border:'1px solid #e2e8f0' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'0.5rem', marginBottom:'0.4rem' }}>
                      <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#374151' }}>{a.session} · {a.semester}</span>
                      <span style={{ fontSize:'0.72rem', color:'#94a3b8' }}>
                        {new Date(a.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:'1.25rem' }}>
                      <span style={{ fontSize:'0.78rem', color:'#6b7280' }}><strong style={{ color:'#374151' }}>{a.total_students}</strong> students</span>
                      <span style={{ fontSize:'0.78rem', color:'#6b7280' }}><strong style={{ color:'#374151' }}>{a.total_attendance}</strong> attendance records</span>
                    </div>
                  </div>
                )
              })()}

              {/* Step 2 — Level & Course filters (shown once archive data is loaded) */}
              {selArchiveLoading && (
                <div style={{ display:'flex', justifyContent:'center', padding:'0.5rem 0' }}><Spinner size={16} color="brand"/></div>
              )}
              {selArchiveData && !selArchiveLoading && (
                <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                  <div style={{ flex:'1 1 130px' }}>
                    <label style={LBL}>Level</label>
                    <select style={INP} value={pdfLevel} onChange={e => setPdfLevel(e.target.value)}>
                      <option value="all">All Levels</option>
                      {['ND I','ND II','HND I','HND II'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:'1 1 130px' }}>
                    <label style={LBL}>Course</label>
                    <select style={INP} value={pdfCourse} onChange={e => setPdfCourse(e.target.value)}>
                      <option value="all">All Courses</option>
                      {(selArchiveData.data?.courses || []).map(c => (
                        <option key={c.code} value={c.code}>{c.code}{c.title ? ` — ${c.title}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3 — Action buttons */}
              {selArchiveId && (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <button onClick={handleDownloadPDF} disabled={pdfLoading || !selArchiveData || selArchiveLoading}
                      style={{ flex:'1 1 auto', display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'0.72rem', borderRadius:10, border:'none', background:(pdfLoading||!selArchiveData||selArchiveLoading)?'#94a3b8':'linear-gradient(135deg,#1F6F5F,#2FA084)', color:'#fff', fontWeight:700, fontSize:'0.83rem', cursor:(pdfLoading||!selArchiveData||selArchiveLoading)?'not-allowed':'pointer', fontFamily:'inherit' }}>
                      {pdfLoading ? <Spinner size={13}/> : <FileText size={13}/>}
                      {pdfLoading ? 'Building…' : 'Download PDF'}
                    </button>

                    {deleteConfirmId === selArchiveId ? (
                      <button onClick={handleDeleteArchive} disabled={deletingArchive}
                        style={{ flex:'0 0 auto', display:'flex', alignItems:'center', gap:5, padding:'0.72rem 0.9rem', borderRadius:10, border:'none', background:'#dc2626', color:'#fff', fontWeight:700, fontSize:'0.8rem', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                        {deletingArchive ? <Spinner size={12}/> : <Trash2 size={12}/>}
                        {deletingArchive ? 'Deleting…' : 'Confirm Delete'}
                      </button>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(selArchiveId)} title="Remove this archive from cloud storage"
                        style={{ flex:'0 0 auto', display:'flex', alignItems:'center', gap:5, padding:'0.72rem 0.9rem', borderRadius:10, border:'1px solid rgba(239,68,68,0.35)', background:'rgba(239,68,68,0.05)', color:'#dc2626', fontWeight:600, fontSize:'0.8rem', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                        <Trash2 size={12}/> Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>)}
          </div>
        </div>

        {/* Clear Session Data */}
        <div style={CARD}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem', paddingBottom:'0.9rem', borderBottom:'1px solid #f1f5f9' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'rgba(239,68,68,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Trash2 size={15} color="#dc2626" />
            </div>
            <h3 style={{ margin:0, fontSize:'0.88rem', fontWeight:800, color:'#1e293b' }}>Clear Session Data</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            <p style={{ margin:0, fontSize:'0.8rem', color:'#64748b', lineHeight:1.55 }}>
              Permanently deletes all students, face enrollments, attendance records, and absence requests. <strong style={{ color:'#dc2626' }}>Always backup first.</strong> Courses and lecturers are not affected.
            </p>
            <button onClick={()=>setShowClearModal(true)}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'0.78rem', borderRadius:11, border:'1.5px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.04)', color:'#dc2626', fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.6)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.04)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.4)' }}>
              <Trash2 size={14}/> Clear All Session Data
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
