import { useState, useEffect, useRef } from 'react'
import { Search, Printer, Trash2, Users, ClipboardList, X, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { useAuthStore } from '@/store/authStore'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getEnrolledStudents, deleteStudent, getStudentAttendance, updateAttendanceRecord, logAudit } from '@/services/studentService'
import { getCourses } from '@/services/courseService'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { LEVELS, getInitials } from '@/utils'

function StudentAvatar({ name, photoUrl, size = 28 }) {
  const [failed, setFailed] = useState(false)
  if (photoUrl && !failed) {
    return (
      <img src={photoUrl} alt={name} onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #e2e8f0' }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#2FA084,#1F6F5F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
      {getInitials(name)}
    </div>
  )
}


function PhotoLightbox({ src, alt = 'Photo', label = '', onClose }) {
  const [scale,  setScale]  = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging  = useRef(false)
  const lastPos   = useRef({ x: 0, y: 0 })
  const lastDist  = useRef(null)

  function zoom(delta) {
    setScale(s => {
      const next = Math.min(4, Math.max(1, parseFloat((s + delta).toFixed(2))))
      if (next === 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }

  function onWheel(e) { e.preventDefault(); zoom(e.deltaY < 0 ? 0.2 : -0.2) }

  function onMouseDown(e) {
    if (scale <= 1) return
    dragging.current = true
    lastPos.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }
  function onMouseMove(e) {
    if (!dragging.current) return
    setOffset({ x: e.clientX - lastPos.current.x, y: e.clientY - lastPos.current.y })
  }
  function onMouseUp() { dragging.current = false }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDist.current = Math.hypot(dx, dy)
    } else if (e.touches.length === 1 && scale > 1) {
      dragging.current = true
      lastPos.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y }
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 2 && lastDist.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      zoom((dist - lastDist.current) / 120)
      lastDist.current = dist
    } else if (e.touches.length === 1 && dragging.current) {
      setOffset({ x: e.touches[0].clientX - lastPos.current.x, y: e.touches[0].clientY - lastPos.current.y })
    }
  }
  function onTouchEnd() { dragging.current = false; lastDist.current = null }

  return (
    <div onClick={e => e.stopPropagation()}
      style={{ background: '#fff', borderRadius: 22, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', overflow: 'hidden', maxWidth: '92vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', width: 480 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {label || 'Photo'}
        </p>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <X size={14} />
        </button>
      </div>
      {/* Photo canvas */}
      <div style={{ overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', cursor: scale > 1 ? 'grab' : 'default', userSelect: 'none', minHeight: 260 }}
        onWheel={onWheel}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <img src={src} alt={alt} draggable={false}
          onDoubleClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
          style={{
            maxWidth: '72vw', maxHeight: '55vh', display: 'block',
            borderRadius: scale > 1 ? 4 : 14,
            objectFit: 'contain',
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
            transformOrigin: 'center',
            transition: dragging.current ? 'none' : 'transform 0.18s ease',
            userSelect: 'none', WebkitUserSelect: 'none',
            boxShadow: scale === 1 ? '0 8px 32px rgba(31,111,95,0.15)' : 'none',
          }} />
      </div>
      {/* Footer: zoom controls + hint + back */}
      <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button onClick={() => zoom(-0.25)} disabled={scale <= 1}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: scale > 1 ? 'pointer' : 'not-allowed', opacity: scale <= 1 ? 0.35 : 1, fontSize: '1.2rem', lineHeight: 1, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>−</button>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', minWidth: 38, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
        <button onClick={() => zoom(0.25)} disabled={scale >= 4}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: scale < 4 ? 'pointer' : 'not-allowed', opacity: scale >= 4 ? 0.35 : 1, fontSize: '1.2rem', lineHeight: 1, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>+</button>
        {scale > 1 && (
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
            style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2FA084', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '0 4px' }}>Reset</button>
        )}
        <span style={{ flex: 1, fontSize: '0.62rem', color: '#cbd5e1', textAlign: 'center' }}>
          {scale === 1 ? 'Scroll or + to zoom' : 'Drag to pan · double-click to reset'}
        </span>
        <button onClick={onClose}
          style={{ padding: '0.5rem 1.1rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
      </div>
    </div>
  )
}

const STATUS_OPTIONS = ['present', 'absent']
const STATUS_STYLES = {
  present: { bg: '#dcfce7', color: '#166534' },
  absent:  { bg: '#fee2e2', color: '#991b1b' },
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

  // Photo lightbox
  const [lightboxUrl,   setLightboxUrl]   = useState(null)

  // Student profile panel
  const [viewStudent,   setViewStudent]   = useState(null)
  const [viewAtt,       setViewAtt]       = useState([])
  const [viewAttLoading, setViewAttLoading] = useState(false)

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
      logAudit(profile, 'delete_student', 'student', confirmDelete.matric, { name: confirmDelete.name })
      setStudents(prev => prev.filter(s => s.matric !== confirmDelete.matric))
      toast('Student record deleted', 'success')
      setConfirmDelete(null)
    } catch (err) { toast(err.message || 'Failed to delete', 'error') }
    finally { setDeleting(false) }
  }

  async function openProfile(student) {
    setViewStudent(student)
    setViewAtt([])
    setViewAttLoading(true)
    try {
      const records = await getStudentAttendance(student.matric)
      setViewAtt(records)
    } catch { /* silent */ }
    finally { setViewAttLoading(false) }
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
      logAudit(profile, 'update_attendance', 'attendance', record.id, { matric: attStudent?.matric, week: record.week, old: record.status, new: newStatus })
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

      {/* ── Photo lightbox ── */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <PhotoLightbox src={lightboxUrl} alt="Student photo" label="Student Photo" onClose={() => setLightboxUrl(null)} />
        </div>
      )}

      {/* ── Student profile panel ── */}
      {viewStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ width: '95vw', maxWidth: 460, background: '#fff', borderRadius: 22, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden' }}>

            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0.8rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Student Profile</p>
              <button onClick={() => setViewStudent(null)}
                style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>
              {/* Photo + name hero */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {viewStudent.photo_url ? (
                  <button onClick={() => setLightboxUrl(viewStudent.photo_url)} title="Click to enlarge"
                    style={{ border: 'none', padding: 0, background: 'transparent', cursor: 'zoom-in', borderRadius: '50%', position: 'relative' }}>
                    <img src={viewStudent.photo_url} alt={viewStudent.name}
                      style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(47,160,132,0.3)', boxShadow: '0 6px 24px rgba(31,111,95,0.22)' }} />
                    <div style={{ position: 'absolute', bottom: 3, right: 3, width: 24, height: 24, borderRadius: '50%', background: '#1F6F5F', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" style={{ width: 12, height: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                    </div>
                  </button>
                ) : (
                  <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg,#2FA084,#1F6F5F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: '#fff', boxShadow: '0 6px 24px rgba(31,111,95,0.22)' }}>
                    {getInitials(viewStudent.name)}
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>{viewStudent.name}</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748b' }}>{viewStudent.matric}</p>
                </div>
              </div>

              {/* Info rows */}
              <div style={{ background: '#f8fafc', borderRadius: 14, overflow: 'hidden', marginBottom: '1rem' }}>
                {[
                  { label: 'Level',      value: viewStudent.level  || '—' },
                  { label: 'Course',     value: viewStudent.option || '—' },
                  { label: 'Department', value: 'Electrical / Electronics Engineering' },
                  { label: 'Status',     value: 'Enrolled', badge: true },
                ].map(({ label, value, badge }, i, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 1rem', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
                    {badge ? (
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', borderRadius: 99, padding: '3px 10px' }}>Enrolled</span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Attendance summary */}
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Attendance Summary</p>
              {viewAttLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner size={20} color="brand" /></div>
              ) : (() => {
                const present = viewAtt.filter(r => r.status === 'present' || r.present).length
                const total   = viewAtt.length
                const pct     = total > 0 ? Math.round(present / total * 100) : 0
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    {[
                      { label: 'Present', val: present, color: '#16a34a', bg: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.18)' },
                      { label: 'Absent',  val: total - present, color: '#dc2626', bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.18)' },
                      { label: 'Rate',    val: `${pct}%`,  color: pct >= 75 ? '#16a34a' : '#dc2626', bg: '#f8fafc', border: '#e2e8f0' },
                    ].map(({ label, val, color, bg, border }) => (
                      <div key={label} style={{ textAlign: 'center', padding: '0.75rem 0.5rem', borderRadius: 12, background: bg, border: `1px solid ${border}` }}>
                        <p style={{ margin: '0 0 0.15rem', fontSize: '1.3rem', fontWeight: 900, color, lineHeight: 1 }}>{val}</p>
                        <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Footer actions */}
            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
              <button onClick={() => { setViewStudent(null); openAttendance(viewStudent) }}
                style={{ flex: 1, padding: '0.6rem', borderRadius: 10, border: '1.5px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)', color: '#6366f1', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <ClipboardList size={13} /> Edit Attendance
              </button>
              <button onClick={() => setViewStudent(null)}
                style={{ padding: '0.6rem 1.1rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}

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
                  { label: 'Absent',  val: attRecords.filter(r => (r.status || (r.present ? 'present' : 'absent')) !== 'present').length,  color: '#dc2626' },
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
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '9%'  }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Name', 'Matric', 'Lvl', 'Course', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.4rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#9ca3af', fontSize: '0.8rem' }}>No students found</td></tr>
              )}
              {paginated.map(s => (
                <tr key={s.matric} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '0.45rem 0.4rem', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                      {/* Click avatar → lightbox */}
                      <button onClick={e => { e.stopPropagation(); if (s.photo_url) setLightboxUrl(s.photo_url) }}
                        title={s.photo_url ? 'Click to enlarge photo' : ''}
                        style={{ border: 'none', padding: 0, background: 'transparent', cursor: s.photo_url ? 'zoom-in' : 'default', flexShrink: 0, borderRadius: '50%' }}>
                        <StudentAvatar name={s.name} photoUrl={s.photo_url} />
                      </button>
                      {/* Click name → profile panel */}
                      <button onClick={() => openProfile(s)}
                        style={{ border: 'none', padding: 0, background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#1F6F5F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontFamily: 'inherit', textAlign: 'left', textDecoration: 'underline', textDecorationColor: 'rgba(31,111,95,0.3)', textUnderlineOffset: 2 }}>
                        {s.name}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '0.45rem 0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.62rem', color: '#6b7280' }}>{s.matric}</td>
                  <td style={{ padding: '0.45rem 0.4rem', color: '#6b7280' }}>{s.level}</td>
                  <td style={{ padding: '0.45rem 0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151', fontSize: '0.7rem' }}>{s.option || '—'}</td>
                  <td style={{ padding: '0.45rem 0.4rem' }}><Badge status="active" /></td>
                  <td style={{ padding: '0.45rem 0.4rem' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openAttendance(s)} title="Attendance"
                        style={{ padding: '0.28rem 0.38rem', borderRadius: 7, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ClipboardList size={12} />
                      </button>
                      <button onClick={() => setConfirmDelete(s)} title="Delete"
                        style={{ padding: '0.28rem 0.38rem', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={12} />
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
