import { useState, useEffect } from 'react'
import { Search, Printer, Trash2, Users, ClipboardList, X, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { useAuthStore } from '@/store/authStore'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getEnrolledStudents, deleteStudent, getStudentAttendance, updateAttendanceRecord } from '@/services/studentService'
import { getCourses } from '@/services/courseService'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { LEVELS } from '@/utils'

function getCourseFromMatric(matric) {
  if (!matric) return '—'
  const m = String(matric).toUpperCase()
  if (m.includes('240137')) return 'Power & Machine (HND)'
  if (m.includes('240136')) return 'Electronics & Telecom (HND)'
  if (m.includes('240106')) return 'EEE Technology (ND)'
  return '—'
}

const STATUS_OPTIONS = ['present', 'absent', 'late']
const STATUS_STYLES = {
  present: { bg: '#dcfce7', color: '#166534' },
  absent:  { bg: '#fee2e2', color: '#991b1b' },
  late:    { bg: '#fef9c3', color: '#92400e' },
}

export default function StudentsPage() {
  const { profile } = useAuthStore()
  const [students,      setStudents]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [level,         setLevel]         = useState('All')
  const [page,          setPage]          = useState(1)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(false)

  // Attendance correction modal state
  const [attStudent,    setAttStudent]    = useState(null)
  const [attRecords,    setAttRecords]    = useState([])
  const [attLoading,    setAttLoading]    = useState(false)
  const [courseMap,     setCourseMap]     = useState({})
  const [savingId,      setSavingId]      = useState(null)

  const PER_PAGE = 10
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([getEnrolledStudents(), getCourses()])
      .then(([s, c]) => {
        setStudents(s)
        const map = {}
        c.forEach(course => { map[course.id] = course })
        setCourseMap(map)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteStudent(confirmDelete.matric)
      setStudents(prev => prev.filter(s => s.matric !== confirmDelete.matric))
      toast('Student record deleted', 'success')
      setConfirmDelete(null)
    } catch (err) { toast(err.message || 'Failed to delete', 'error') }
    finally { setDeleting(false) }
  }

  async function openAttendance(student) {
    setAttStudent(student)
    setAttRecords([])
    setAttLoading(true)
    try {
      const records = await getStudentAttendance(student.matric)
      setAttRecords(records)
    } catch { toast('Failed to load records', 'error') }
    finally { setAttLoading(false) }
  }

  async function handleStatusChange(record, newStatus) {
    setSavingId(record.id)
    try {
      await updateAttendanceRecord(record.id, newStatus)
      setAttRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: newStatus, present: newStatus === 'present' } : r))
      toast('Attendance updated', 'success')
    } catch { toast('Failed to update', 'error') }
    finally { setSavingId(null) }
  }

  const filtered = students
    .filter(s => level === 'All' || s.level === level)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.matric.includes(search.toUpperCase()))

  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <AdminLayout>

      {/* ── Delete modal ── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '90vw', maxWidth: 380, background: '#fff', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', padding: '1.75rem 1.5rem', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#dc2626' }}>
              <Trash2 size={22} />
            </div>
            <p style={{ margin: '0 0 0.35rem', fontWeight: 800, fontSize: '0.97rem', color: '#0f172a' }}>Delete Student?</p>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.55 }}>
              <strong>{confirmDelete.name}</strong> ({confirmDelete.matric}) will be permanently removed including all face data.
            </p>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 10, border: 'none', background: deleting ? 'rgba(239,68,68,0.4)' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                {deleting ? <Spinner size={14} color="white" /> : <Trash2 size={14} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance correction modal ── */}
      {attStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ width: '95vw', maxWidth: 680, background: '#fff', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{attStudent.name}</p>
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{attStudent.matric} · {attStudent.level}</p>
              </div>
              <button onClick={() => setAttStudent(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={15} />
              </button>
            </div>

            {/* Info banner */}
            <div style={{ padding: '0.7rem 1.4rem', background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <AlertTriangle size={13} color="#6366f1" />
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>
                Click the status badge on any record to correct it. Changes save immediately.
              </p>
            </div>

            {/* Records */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {attLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner size={24} color="brand" /></div>
              ) : attRecords.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <ClipboardList size={32} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>No attendance records found</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {['Date', 'Week', 'Course', 'Semester', 'Status'].map(h => (
                        <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(0,0,0,0.02)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attRecords.map(r => {
                      const course = courseMap[r.course_id]
                      const st = r.status || (r.present ? 'present' : 'absent')
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem', color: '#374151' }}>{r.date || '—'}</td>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.78rem', color: '#6b7280' }}>Wk {r.week || '—'}</td>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>
                            {course ? course.code : <span style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.65rem' }}>{r.course_id?.slice(0, 8)}…</span>}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.75rem', color: '#9ca3af' }}>{r.semester || '—'}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            {savingId === r.id ? (
                              <Spinner size={14} color="brand" />
                            ) : (
                              <div style={{ display: 'flex', gap: 4 }}>
                                {STATUS_OPTIONS.map(s => (
                                  <button key={s} onClick={() => st !== s && handleStatusChange(r, s)}
                                    style={{ padding: '0.18rem 0.6rem', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, cursor: st === s ? 'default' : 'pointer', border: st === s ? '2px solid transparent' : '1.5px solid #e2e8f0', background: st === s ? STATUS_STYLES[s].bg : '#f8fafc', color: st === s ? STATUS_STYLES[s].color : '#94a3b8', outline: st === s ? `2px solid ${STATUS_STYLES[s].color}30` : 'none', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Summary footer */}
            {attRecords.length > 0 && (
              <div style={{ padding: '0.75rem 1.4rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', gap: '1.25rem', flexShrink: 0 }}>
                {[
                  { label: 'Present', val: attRecords.filter(r => (r.status || (r.present ? 'present' : 'absent')) === 'present').length, color: '#16a34a' },
                  { label: 'Absent',  val: attRecords.filter(r => (r.status || (r.present ? 'present' : 'absent')) === 'absent').length,  color: '#dc2626' },
                  { label: 'Late',    val: attRecords.filter(r => r.status === 'late').length,                                              color: '#d97706' },
                ].map(({ label, val, color }) => (
                  <span key={label} style={{ fontSize: '0.78rem', fontWeight: 700, color }}>
                    {label}: {val}
                  </span>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#6b7280' }}>
                  {attRecords.length} total records
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div style={{ marginBottom: '0.25rem' }}>
            <AnimatedLabel text="Students" Icon={Users} />
          </div>
          <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{profile?.name || 'Administrator'}</h1>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {/* Filters */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name or matric…" className="input-field pl-9 py-2 text-sm"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select value={level} onChange={e => { setLevel(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 bg-white">
            <option value="All">All Levels</option>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={24} color="brand" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Name', 'Matric No.', 'Level', 'Option/Course', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No students found</td></tr>
              )}
              {paginated.map(s => (
                <tr key={s.matric} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{s.matric}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.level}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getCourseFromMatric(s.matric)}</td>
                  <td className="px-4 py-3"><Badge status="active" /></td>
                  <td className="px-4 py-3">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openAttendance(s)} title="View & correct attendance"
                        style={{ padding: '0.3rem 0.55rem', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)' }}>
                        <ClipboardList size={12} /> Attendance
                      </button>
                      <button onClick={() => setConfirmDelete(s)} title="Delete student"
                        style={{ padding: '0.3rem 0.5rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} students
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${page === p ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
