import { useState, useEffect } from 'react'
import { Bell, RefreshCw, UserPlus, FileText, Check, X, Paperclip, Info, Fingerprint, RotateCcw } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { useAuthStore } from '@/store/authStore'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { approveLecturer, rejectLecturer } from '@/services/authService'
import { getPendingLecturers } from '@/services/courseService'
import { notifyStudent } from '@/services/studentService'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}


export default function NotificationsPage() {
  const { profile } = useAuthStore()
  const [pendingLecturers,  setPendingLecturers]  = useState([])
  const [reenrollRequests,  setReenrollRequests]  = useState([])
  const [absenceRequests,   setAbsenceRequests]   = useState([])
  const [loading,    setLoading]   = useState(true)
  const [approving,  setApproving] = useState(null)
  const { toast } = useToast()

  async function load() {
    setLoading(true)
    try {
      const [lecs, reenroll, absence] = await Promise.all([
        getPendingLecturers(),
        supabase.from('reenroll_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }).then(r => r.data || []),
        supabase.from('absence_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }).then(r => r.data || []),
      ])
      setPendingLecturers(lecs)
      setReenrollRequests(reenroll)
      setAbsenceRequests(absence)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleApprove(uid) {
    setApproving(uid)
    try {
      await approveLecturer(uid)
      setPendingLecturers(prev => prev.filter(l => l.id !== uid))
      toast('Lecturer approved — they can now log in', 'success')
    } catch { toast('Failed to approve', 'error') }
    finally { setApproving(null) }
  }

  async function handleReject(uid) {
    try {
      await rejectLecturer(uid)
      setPendingLecturers(prev => prev.filter(l => l.id !== uid))
      toast('Lecturer rejected', 'success')
    } catch { toast('Failed to reject', 'error') }
  }

  async function handleReenrollApprove(r) {
    setApproving(r.id)
    try {
      await supabase.from('face_descriptors').delete().eq('matric', r.matric)
      await supabase.from('students').update({ enrolled: false }).eq('matric', r.matric)
      await supabase.from('reenroll_requests').update({ status: 'approved' }).eq('id', r.id)
      setReenrollRequests(prev => prev.filter(x => x.id !== r.id))
      toast(`Re-enrolment approved — ${r.student_name || r.matric}'s face data cleared`, 'success')
      notifyStudent(r.matric, {
        text:
          `&#9989; <b>RE-ENROLMENT APPROVED</b>\n` +
          `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
          `Hello <b>${(r.student_name || r.matric).split(' ')[0]}</b>,\n\n` +
          `Your re-enrolment request has been <b>APPROVED</b>.\n\n` +
          `Your face data has been cleared. Please re-enrol via the GAPOSA app:\n` +
          `<b>Profile → Re-enrollment</b>\n\n` +
          `<i>EEE FACE-ID · Gateway ICT Polytechnic</i>`,
      }).catch(() => {})
    } catch { toast('Failed to approve re-enrolment', 'error') }
    finally { setApproving(null) }
  }

  async function handleReenrollReject(r) {
    try {
      await supabase.from('reenroll_requests').update({ status: 'rejected' }).eq('id', r.id)
      setReenrollRequests(prev => prev.filter(x => x.id !== r.id))
      toast('Re-enrolment rejected', 'success')
      notifyStudent(r.matric, {
        text:
          `&#10060; <b>RE-ENROLMENT REJECTED</b>\n` +
          `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
          `Hello <b>${(r.student_name || r.matric).split(' ')[0]}</b>,\n\n` +
          `Your re-enrolment request has been <b>REJECTED</b>.\n\n` +
          `Contact admin if you believe this is incorrect.\n\n` +
          `<i>EEE FACE-ID · Gateway ICT Polytechnic</i>`,
      }).catch(() => {})
    } catch { toast('Failed to reject', 'error') }
  }

  async function handleAbsenceApprove(r) {
    setApproving(r.id)
    try {
      await supabase.from('absence_requests').update({ status: 'approved' }).eq('id', r.id)
      setAbsenceRequests(prev => prev.filter(x => x.id !== r.id))
      toast(`Absence approved for ${r.student_name || r.matric} — notify the relevant lecturer(s)`, 'success')
      notifyStudent(r.matric, {
        text:
          `&#9989; <b>ABSENCE REQUEST APPROVED</b>\n` +
          `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
          `Hello <b>${(r.student_name || r.matric).split(' ')[0]}</b>,\n\n` +
          `Your absence request has been <b>APPROVED</b>.\n\n` +
          `The concerned lecturers will be notified.\n\n` +
          `<i>EEE FACE-ID · Gateway ICT Polytechnic</i>`,
      }).catch(() => {})
    } catch { toast('Failed to approve absence', 'error') }
    finally { setApproving(null) }
  }

  async function handleAbsenceReject(r) {
    try {
      await supabase.from('absence_requests').update({ status: 'rejected' }).eq('id', r.id)
      setAbsenceRequests(prev => prev.filter(x => x.id !== r.id))
      toast('Absence request rejected', 'success')
      notifyStudent(r.matric, {
        text:
          `&#10060; <b>ABSENCE REQUEST REJECTED</b>\n` +
          `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
          `Hello <b>${(r.student_name || r.matric).split(' ')[0]}</b>,\n\n` +
          `Your absence request has been <b>REJECTED</b>.\n\n` +
          `Contact admin if you believe this is incorrect.\n\n` +
          `<i>EEE FACE-ID · Gateway ICT Polytechnic</i>`,
      }).catch(() => {})
    } catch { toast('Failed to reject', 'error') }
  }

  const total = pendingLecturers.length + reenrollRequests.length + absenceRequests.length

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AnimatedLabel text="Notifications" Icon={Bell} />
            {total > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{total}</span>
            )}
          </div>
          <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 }}>{profile?.name || 'Administrator'}</h1>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 font-medium transition-colors">
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} color="brand"/></div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4" style={{ color:'#16a34a' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width:32,height:32 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <p className="text-gray-700 font-semibold text-base">All clear!</p>
          <p className="text-gray-400 text-sm mt-1">No pending actions at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Lecturer Approvals ── */}
          {pendingLecturers.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-amber-50">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center" style={{ color:'#d97706' }}><UserPlus size={16} strokeWidth={1.8}/></div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Lecturer Registration Requests</p>
                  <p className="text-xs text-gray-400">{pendingLecturers.length} awaiting approval</p>
                </div>
                <span className="ml-auto text-xs font-bold bg-amber-400 text-white px-2.5 py-1 rounded-full">{pendingLecturers.length}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {pendingLecturers.map(l => (
                  <div key={l.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-bold flex-shrink-0">{initials(l.name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{l.name}</p>
                      <p className="text-xs text-gray-400 truncate">{l.email}</p>
                      <p className="text-xs text-gray-300 mt-0.5">{timeAgo(l.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleApprove(l.id)} disabled={approving === l.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                        {approving === l.id ? <Spinner size={12} color="white"/> : <Check size={12} strokeWidth={2.5}/>} Approve
                      </button>
                      <button onClick={() => handleReject(l.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-bold transition-all">
                        <X size={12} strokeWidth={2.5}/> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Re-enrolment Requests ── */}
          {reenrollRequests.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-blue-50">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center" style={{ color:'#2563eb' }}><Fingerprint size={16} strokeWidth={1.8}/></div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Student Re-enrolment Requests</p>
                  <p className="text-xs text-gray-400">{reenrollRequests.length} awaiting approval</p>
                </div>
                <span className="ml-auto text-xs font-bold bg-blue-500 text-white px-2.5 py-1 rounded-full">{reenrollRequests.length}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {reenrollRequests.map(r => (
                  <div key={r.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0 mt-0.5">{initials(r.student_name || r.matric)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm">{r.student_name || 'Unknown'}</p>
                          <span className="text-xs text-gray-300 flex-shrink-0">{timeAgo(r.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{r.matric} · {r.reason}</p>
                        {r.description && <p className="text-xs text-gray-500 mb-2 leading-relaxed">{r.description}</p>}
                        {r.document_url && (
                          <a href={r.document_url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium mb-2 transition-colors">
                            <Paperclip size={11}/> {r.document_name || 'Supporting document'}
                          </a>
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: '#dbeafe', borderLeft: '3px solid #2563eb', borderRadius: '0 8px 8px 0', padding: '0.55rem 0.75rem', marginBottom: '0.75rem' }}>
                          <Info size={13} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 1 }}/>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#1e3a8a', fontWeight: 600, lineHeight: 1.5 }}>
                            Approving clears this student's face data. They must re-enroll their face before attending any class.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleReenrollApprove(r)} disabled={approving === r.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                            {approving === r.id ? <Spinner size={12} color="white"/> : <Check size={12} strokeWidth={2.5}/>} Approve & Clear Face Data
                          </button>
                          <button onClick={() => handleReenrollReject(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-bold transition-all">
                            <X size={12} strokeWidth={2.5}/> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Absence Requests ── */}
          {absenceRequests.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100" style={{ background: '#fdf4ff' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f3e8ff', color: '#7c3aed' }}><FileText size={16} strokeWidth={1.8}/></div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Student Absence Requests</p>
                  <p className="text-xs text-gray-400">{absenceRequests.length} awaiting approval</p>
                </div>
                <span className="ml-auto text-xs font-bold text-white px-2.5 py-1 rounded-full" style={{ background: '#7c3aed' }}>{absenceRequests.length}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {absenceRequests.map(r => (
                  <div key={r.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5" style={{ background: '#f3e8ff', color: '#7c3aed' }}>{initials(r.student_name || r.matric)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm">{r.student_name || 'Unknown'}</p>
                          <span className="text-xs text-gray-300 flex-shrink-0">{timeAgo(r.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{r.matric} · {r.reason_type}</p>
                        {r.description && <p className="text-xs text-gray-500 mb-1 leading-relaxed">{r.description}</p>}
                        {r.absence_dates?.length > 0 && (
                          <p className="text-xs text-gray-400 mb-2">
                            Absent dates: {Array.isArray(r.absence_dates) ? r.absence_dates.join(', ') : r.absence_dates}
                          </p>
                        )}
                        {r.document_url && (
                          <a href={r.document_url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium mb-2 transition-colors">
                            <Paperclip size={11}/> {r.document_name || 'Supporting document'}
                          </a>
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: '#ede9fe', borderLeft: '3px solid #7c3aed', borderRadius: '0 8px 8px 0', padding: '0.55rem 0.75rem', marginBottom: '0.75rem' }}>
                          <Info size={13} color="#6d28d9" style={{ flexShrink: 0, marginTop: 1 }}/>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#4c1d95', fontWeight: 600, lineHeight: 1.5 }}>
                            On approval — contact the relevant lecturer(s) for the missed class(es) on the dates listed above and request leniency for this student's attendance mark.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleAbsenceApprove(r)} disabled={approving === r.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                            {approving === r.id ? <Spinner size={12} color="white"/> : <Check size={12} strokeWidth={2.5}/>} Approve
                          </button>
                          <button onClick={() => handleAbsenceReject(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-bold transition-all">
                            <X size={12} strokeWidth={2.5}/> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </AdminLayout>
  )
}
