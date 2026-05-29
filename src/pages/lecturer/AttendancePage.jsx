import { useState, useEffect, useRef } from 'react'
import { LecturerLayout } from '@/components/layout/LecturerLayout'
import { useAuthStore } from '@/store/authStore'
import { getLecturerCourses } from '@/services/courseService'
import { getCourseAttendance, getEnrolledStudents, bulkMarkAttendance, getPendingDisputesForCourses, resolveDispute, notifyStudent, updateAttendanceRecord } from '@/services/studentService'
import { getSettings } from '@/services/courseService'
import { Spinner } from '@/components/ui/Spinner'
import { normalizeLevel, levelFromCourseCode } from '@/utils'
import { Badge } from '@/components/ui/Badge'
import { Download, Search, CalendarCheck, Upload, AlertCircle, Check, X } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { formatTime } from '@/utils'
import { useToast } from '@/components/ui/Toast'

export default function AttendancePage() {
  const { profile }  = useAuthStore()
  const { toast }    = useToast()
  const fileRef      = useRef(null)
  const [courses,    setCourses]   = useState([])
  const [students,   setStudents]  = useState([])
  const [records,    setRecords]   = useState([])
  const [settings,   setSettings]  = useState({})
  const [loading,    setLoading]   = useState(true)
  const [activeTab,  setActiveTab] = useState('register') // 'register' | 'summary' | 'disputes' | 'import'
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedWeek,   setSelectedWeek]   = useState(1)
  const [search,         setSearch]         = useState('')
  // Disputes
  const [disputes,       setDisputes]       = useState([])
  const [disputeNotes,   setDisputeNotes]   = useState({})
  const [resolvingId,    setResolvingId]    = useState(null)
  // Bulk import
  const [importText,     setImportText]     = useState('')
  const [importPreview,  setImportPreview]  = useState([])
  const [importing,      setImporting]      = useState(false)
  const [importErrors,   setImportErrors]   = useState([])
  const [togglingId,     setTogglingId]     = useState(null)

  useEffect(() => {
    Promise.all([getLecturerCourses(profile.id), getEnrolledStudents(), getSettings()])
      .then(([c, s, st]) => {
        setCourses(c); setStudents(s); setSettings(st)
        if (c.length) setSelectedCourse(c[0].id)
        getPendingDisputesForCourses(c.map(x => x.id)).then(setDisputes)
      })
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

  async function handleToggleStatus(rec) {
    if (!rec?.id) return
    setTogglingId(rec.id)
    const next = rec.status === 'present' ? 'absent' : 'present'
    try {
      await updateAttendanceRecord(rec.id, next)
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, status: next, present: next === 'present' } : r))
      toast(`${rec.matric} marked ${next}`, 'success')
    } catch { toast('Failed to update', 'error') }
    finally { setTogglingId(null) }
  }

  async function handleResolveDispute(d, status) {
    setResolvingId(d.id)
    const note = disputeNotes[d.id] || ''
    try {
      await resolveDispute(d.id, status, note, status === 'approved' ? d.attendance_id : null)
      setDisputes(prev => prev.filter(x => x.id !== d.id))
      if (status === 'approved') {
        notifyStudent(d.matric, {
          text: `&#9989; <b>ATTENDANCE DISPUTE APPROVED</b>\n&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\nYour attendance dispute for <b>${d.course_code}</b> Week ${d.week} has been <b>APPROVED</b>. Your record has been updated to Present.\n\n<i>EEE FACE-ID · Gateway ICT Polytechnic</i>`,
        }).catch(() => {})
        toast('Dispute approved — attendance updated to present', 'success')
      } else {
        notifyStudent(d.matric, {
          text: `&#10060; <b>ATTENDANCE DISPUTE REJECTED</b>\n&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\nYour attendance dispute for <b>${d.course_code}</b> Week ${d.week} has been <b>REJECTED</b>.${note ? `\n\nNote: ${note}` : ''}\n\n<i>EEE FACE-ID · Gateway ICT Polytechnic</i>`,
        }).catch(() => {})
        toast('Dispute rejected', 'success')
      }
    } catch { toast('Failed to resolve dispute', 'error') }
    finally { setResolvingId(null) }
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
    const errors = []; const rows = []
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      if (parts.length < 3) { errors.push(`Row ${i+1}: need at least matric,week,status`); continue }
      const [matric, weekRaw, statusRaw] = parts
      const week = parseInt(weekRaw)
      const status = statusRaw.toLowerCase()
      if (!matric) { errors.push(`Row ${i+1}: missing matric`); continue }
      if (isNaN(week) || week < 1) { errors.push(`Row ${i+1}: invalid week "${weekRaw}"`); continue }
      if (status !== 'present' && status !== 'absent') { errors.push(`Row ${i+1}: status must be present or absent`); continue }
      const student = students.find(s => s.matric.toUpperCase() === matric.toUpperCase())
      rows.push({ matric: matric.toUpperCase(), name: student?.name || matric, week, status, found: !!student })
    }
    return { rows, errors }
  }

  function handleImportTextChange(text) {
    setImportText(text)
    if (!text.trim()) { setImportPreview([]); setImportErrors([]); return }
    const { rows, errors } = parseCSV(text)
    setImportPreview(rows); setImportErrors(errors)
  }

  async function handleBulkImport() {
    if (!importPreview.length || !selectedCourse) return
    setImporting(true)
    try {
      const records = importPreview.map(r => ({
        matric: r.matric, name: r.name, week: r.week, status: r.status,
        courseId: selectedCourse, lecturerId: profile.id,
        semester: settings.semester || '', session: settings.session || '',
      }))
      const count = await bulkMarkAttendance(records)
      toast(`${count} attendance record${count !== 1 ? 's' : ''} imported`, 'success')
      setImportText(''); setImportPreview([]); setImportErrors([])
      getCourseAttendance(selectedCourse, selectedWeek).then(setRecords)
    } catch (err) { toast(err.message || 'Import failed', 'error') }
    finally { setImporting(false) }
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
        <div style={{ display: 'flex', gap: 4, background: '#e8edf0', borderRadius: 12, padding: 4, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { id: 'register', label: 'Register' },
            { id: 'summary',  label: 'Summary'  },
            { id: 'disputes', label: `Disputes${disputes.length ? ` (${disputes.length})` : ''}` },
            { id: 'import',   label: 'Bulk Import' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding: '0.45rem 1.1rem', borderRadius: 9, border: 'none', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', background: activeTab === t.id ? '#fff' : 'transparent', color: activeTab === t.id ? (t.id === 'disputes' && disputes.length ? '#dc2626' : '#2FA084') : '#64748b', boxShadow: activeTab === t.id ? '0 2px 8px rgba(31,111,95,0.08)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Register + Summary tabs */}
        {(activeTab === 'register' || activeTab === 'summary') && (<>
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input type="text" placeholder="Search by name or matric…"
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1e293b', boxSizing: 'border-box' }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

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
                      {rec ? (
                        <button
                          onClick={() => handleToggleStatus(rec)}
                          disabled={togglingId === rec.id}
                          title="Click to toggle present / absent"
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: togglingId === rec.id ? 0.5 : 1 }}>
                          <Badge status={rec.status} />
                        </button>
                      ) : <span className="text-xs text-gray-300">—</span>}
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
        </>)}

        {/* Disputes tab */}
        {activeTab === 'disputes' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}>
            {disputes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>No pending disputes</p>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem' }}>Students who dispute an absent marking will appear here</p>
              </div>
            ) : disputes.map(d => (
              <div key={d.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.65rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>{d.student_name}</p>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{d.matric}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '2px 8px', borderRadius: 99 }}>{d.course_code} · Week {d.week}</span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{d.date}</span>
                  </div>
                </div>
                {d.description && (
                  <p style={{ margin: '0 0 0.65rem', fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 8, borderLeft: '3px solid #e2e8f0', lineHeight: 1.5 }}>
                    "{d.description}"
                  </p>
                )}
                <textarea
                  value={disputeNotes[d.id] || ''} onChange={e => setDisputeNotes(p => ({ ...p, [d.id]: e.target.value }))}
                  placeholder="Optional note to student…" rows={2}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit', color: '#374151', marginBottom: '0.5rem', boxSizing: 'border-box', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleResolveDispute(d, 'approved')} disabled={resolvingId === d.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.42rem 0.9rem', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: resolvingId === d.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: resolvingId === d.id ? 0.6 : 1 }}>
                    {resolvingId === d.id ? <Spinner size={11} color="white" /> : <Check size={11} />} Approve
                  </button>
                  <button onClick={() => handleResolveDispute(d, 'rejected')} disabled={resolvingId === d.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.42rem 0.9rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: '0.75rem', cursor: resolvingId === d.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    <X size={11} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bulk Import tab */}
        {activeTab === 'import' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: '1.25rem', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Paste CSV or upload a file</p>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Format: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>matric,week,status</code> — one row per line. Status: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>present</code> or <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>absent</code>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <textarea value={importText} onChange={e => handleImportTextChange(e.target.value)}
                placeholder={'EEE/HND/21/001,3,present\nEEE/HND/21/002,3,absent\n...'}
                rows={6}
                style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace', color: '#1e293b', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]; if (!file) return
                const reader = new FileReader()
                reader.onload = ev => handleImportTextChange(ev.target.result)
                reader.readAsText(file)
                e.target.value = ''
              }} />
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => fileRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', borderRadius: 9, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Upload size={13} /> Upload CSV file
              </button>
              <button onClick={() => { setImportText(''); setImportPreview([]); setImportErrors([]) }}
                style={{ padding: '0.5rem 1rem', borderRadius: 9, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
            </div>

            {importErrors.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>Errors ({importErrors.length})</p>
                {importErrors.map((e, i) => <p key={i} style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#b91c1c' }}>{e}</p>)}
              </div>
            )}

            {importPreview.length > 0 && (
              <>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>Preview — {importPreview.length} records for {courses.find(c => c.id === selectedCourse)?.code}</p>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 10, marginBottom: '0.75rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      {['Matric', 'Name', 'Week', 'Status'].map(h => <th key={h} style={{ padding: '0.45rem 0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {importPreview.map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #f8fafc', background: !r.found ? '#fffbeb' : 'transparent' }}>
                          <td style={{ padding: '0.4rem 0.75rem', fontFamily: 'monospace', color: r.found ? '#1e293b' : '#d97706' }}>{r.matric}</td>
                          <td style={{ padding: '0.4rem 0.75rem', color: r.found ? '#475569' : '#d97706' }}>{r.found ? r.name : '⚠ Not found'}</td>
                          <td style={{ padding: '0.4rem 0.75rem', color: '#94a3b8' }}>Week {r.week}</td>
                          <td style={{ padding: '0.4rem 0.75rem' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: r.status === 'present' ? '#dcfce7' : '#fee2e2', color: r.status === 'present' ? '#166534' : '#991b1b' }}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={handleBulkImport} disabled={importing}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', borderRadius: 10, border: 'none', background: importing ? '#94a3b8' : '#2FA084', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {importing ? <><Spinner size={14} color="white" /> Importing…</> : <><Upload size={14} /> Import {importPreview.length} Records</>}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </LecturerLayout>
  )
}
