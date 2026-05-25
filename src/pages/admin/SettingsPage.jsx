import { useState, useEffect } from 'react'
import { Save, Clock, Download, Settings, Archive, Trash2, AlertTriangle, History, FileJson } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { useAuthStore } from '@/store/authStore'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getSettings, updateSettings, getCourses } from '@/services/courseService'
import { getAllAttendanceWithDetails, getEnrolledStudents, getAllAbsenceRequests, clearSessionData, saveSessionArchive, getSessionArchives, getSessionArchiveData, deleteSessionArchive } from '@/services/studentService'
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
  const [redownloading,  setRedownloading]  = useState(false)
  const [deletingArchive,setDeletingArchive]= useState(false)
  const [deleteConfirmId,setDeleteConfirmId]= useState(null)
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([getSettings(), getCourses(), getSessionArchives()])
      .then(([s, c, a]) => { setSettings(s); setCourses(c); setArchives(a) })
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
          matric:      r.matric,
          student_name: studentMap[r.matric]?.name || r.student_name || '',
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

        {/* Session Backup */}
        <div style={CARD}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem', paddingBottom:'0.9rem', borderBottom:'1px solid #f1f5f9' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'rgba(31,111,95,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Archive size={15} color="#1F6F5F" />
            </div>
            <h3 style={{ margin:0, fontSize:'0.88rem', fontWeight:800, color:'#1e293b' }}>Session Backup</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'0.85rem 1rem', border:'1px solid #e2e8f0' }}>
              <p style={{ margin:'0 0 0.3rem', fontSize:'0.8rem', fontWeight:700, color:'#374151' }}>Backup includes:</p>
              <p style={{ margin:0, fontSize:'0.75rem', color:'#6b7280', lineHeight:1.6 }}>
                All students · Face enrollment status · Full attendance history · Absence requests · Course list
              </p>
            </div>
            <p style={{ margin:0, fontSize:'0.72rem', color:'#94a3b8', lineHeight:1.55 }}>
              Download a complete JSON backup of this session's data before clearing. Keep it safely — you can open it in Excel or any text editor if a dispute arises.
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
              <div>
                <label style={LBL}>Select a session</label>
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
                      <span style={{ fontSize:'0.78rem', color:'#6b7280' }}>
                        <strong style={{ color:'#374151' }}>{a.total_students}</strong> students
                      </span>
                      <span style={{ fontSize:'0.78rem', color:'#6b7280' }}>
                        <strong style={{ color:'#374151' }}>{a.total_attendance}</strong> attendance records
                      </span>
                    </div>
                  </div>
                )
              })()}

              {selArchiveId && (
                <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                  <button onClick={handleRedownload} disabled={redownloading}
                    style={{ flex:'1 1 auto', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'0.7rem 0.9rem', borderRadius:10, border:'none', background:redownloading?'#94a3b8':'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', fontWeight:700, fontSize:'0.82rem', cursor:redownloading?'not-allowed':'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                    {redownloading ? <Spinner size={13}/> : <FileJson size={13}/>}
                    {redownloading ? 'Downloading…' : 'Download JSON'}
                  </button>

                  {deleteConfirmId === selArchiveId ? (
                    <button onClick={handleDeleteArchive} disabled={deletingArchive}
                      style={{ flex:'0 0 auto', display:'flex', alignItems:'center', gap:5, padding:'0.7rem 0.9rem', borderRadius:10, border:'none', background:'#dc2626', color:'#fff', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                      {deletingArchive ? <Spinner size={13}/> : <Trash2 size={13}/>}
                      {deletingArchive ? 'Deleting…' : 'Confirm Delete'}
                    </button>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(selArchiveId)}
                      style={{ flex:'0 0 auto', display:'flex', alignItems:'center', gap:5, padding:'0.7rem 0.9rem', borderRadius:10, border:'1px solid rgba(239,68,68,0.35)', background:'rgba(239,68,68,0.05)', color:'#dc2626', fontWeight:600, fontSize:'0.82rem', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                      <Trash2 size={13}/> Delete
                    </button>
                  )}
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
            <div style={{ background:'rgba(239,68,68,0.04)', borderRadius:10, padding:'0.85rem 1rem', border:'1px solid rgba(239,68,68,0.15)' }}>
              <p style={{ margin:'0 0 0.3rem', fontSize:'0.8rem', fontWeight:700, color:'#dc2626' }}>This deletes permanently:</p>
              <p style={{ margin:0, fontSize:'0.75rem', color:'#6b7280', lineHeight:1.6 }}>
                All students · Face enrollments · Attendance records · Absence requests · Student photos
              </p>
            </div>
            <p style={{ margin:0, fontSize:'0.72rem', color:'#94a3b8', lineHeight:1.55 }}>
              Use this at the end of a session to reset the system for a new intake. <strong style={{ color:'#dc2626' }}>Always download a backup first.</strong> Courses, lecturers, and admin accounts are not affected.
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
