import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Copy, Mail, RefreshCw, BookOpen, X, Search, Check, Trash2, GraduationCap, ChevronDown } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { useAuthStore } from '@/store/authStore'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getLecturers, getCourses } from '@/services/courseService'
import { approveLecturer, rejectLecturer, deleteLecturer, generateLecturerInvite, getLecturerInvites, updateLecturerCourses } from '@/services/authService'
import { sendLecturerInviteEmail, emailJsConfigured } from '@/services/emailService'
import { useToast } from '@/components/ui/Toast'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

/* ── helpers ─────────────────────────────────────────────────── */
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)  return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}
function expiresIn(iso) {
  const ms = new Date(iso) - Date.now()
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3600000)
  if (h < 1) return '< 1h left'
  if (h < 24) return `${h}h left`
  return `${Math.floor(h/24)}d left`
}
function initials(name) {
  return (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
}

/* ── Course Assignment Modal ─────────────────────────────────── */
function CourseModal({ lecturer, allCourses, onClose, onSave }) {
  const [selected, setSelected] = useState(lecturer.courses || [])
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)

  function toggle(id) {
    setSelected(p => p.includes(id) ? p.filter(c=>c!==id) : [...p, id])
  }

  async function handleSave() {
    setSaving(true)
    try { await onSave(lecturer.id, selected) }
    finally { setSaving(false) }
  }

  const filtered = allCourses.filter(c =>
    `${c.code} ${c.title}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' }}>
      <div style={{ width:'92vw', maxWidth:480, borderRadius:20, background:'#fff', boxShadow:'0 24px 80px rgba(0,0,0,0.2)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'85vh' }}>

        {/* Modal header */}
        <div style={{ padding:'1.1rem 1.4rem', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <p style={{ margin:0, fontWeight:800, fontSize:'0.95rem', color:'#0f172a' }}>Assign Courses</p>
            <p style={{ margin:'0.15rem 0 0', fontSize:'0.75rem', color:'#64748b' }}>{lecturer.name} · {selected.length} selected</p>
          </div>
          <button onClick={onClose} style={{ padding:6, borderRadius:8, border:'none', background:'#f1f5f9', cursor:'pointer', display:'flex', alignItems:'center', color:'#64748b' }}><X size={16}/></button>
        </div>

        {/* Search */}
        <div style={{ padding:'0.75rem 1.4rem', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
          <div style={{ position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search courses…"
              style={{ width:'100%', padding:'0.6rem 0.75rem 0.6rem 2rem', borderRadius:10, border:'1px solid #e2e8f0', fontSize:'0.83rem', color:'#1e293b', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
          </div>
        </div>

        {/* Course list */}
        <div style={{ overflowY:'auto', flex:1 }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign:'center', color:'#94a3b8', fontSize:'0.83rem', padding:'2rem' }}>No courses found</p>
          ) : filtered.map((c, i) => {
            const checked = selected.includes(c.id)
            return (
              <div key={c.id} onClick={()=>toggle(c.id)}
                style={{ display:'flex', alignItems:'center', gap:'0.85rem', padding:'0.72rem 1.4rem', cursor:'pointer', background:checked?'rgba(47,160,132,0.04)':i%2===0?'#fafafa':'#fff', borderBottom:'1px solid #f1f5f9', transition:'background 0.12s' }}>
                <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${checked?'#2FA084':'#cbd5e1'}`, background:checked?'#2FA084':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                  {checked && <Check size={11} color="#fff" strokeWidth={3}/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:'0.83rem', fontWeight:700, color:checked?'#2FA084':'#1e293b' }}>{c.code}</p>
                  <p style={{ margin:0, fontSize:'0.72rem', color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:'0.9rem 1.4rem', borderTop:'1px solid #f1f5f9', display:'flex', gap:'0.65rem', flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, padding:'0.72rem', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:600, fontSize:'0.84rem', cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:2, padding:'0.72rem', borderRadius:10, border:'none', background:saving?'rgba(47,160,132,0.4)':'#2FA084', color:'#fff', fontWeight:700, fontSize:'0.84rem', cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
            {saving ? <><Spinner size={14} color="white"/>Saving…</> : <><Check size={14}/>Save Assignments</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function LecturersPage() {
  const { profile } = useAuthStore()
  const [lecturers, setLecturers] = useState([])
  const [invites,   setInvites]   = useState([])
  const [allCourses,setAllCourses]= useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('registered')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting,    setInviting]    = useState(false)
  const [lastCode,    setLastCode]    = useState('')

  // Approve/reject
  const [approving, setApproving] = useState(null)

  // Course modal
  const [courseModal, setCourseModal] = useState(null)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    Promise.all([getLecturers(), getLecturerInvites(), getCourses()])
      .then(([l, inv, c]) => { setLecturers(l); setInvites(inv); setAllCourses(c) })
      .finally(() => setLoading(false))
  }, [])

  const pending    = lecturers.filter(l => l.status === 'pending')
  const registered = lecturers.filter(l => l.status !== 'pending')

  /* ── Invite ── */
  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true); setLastCode('')
    try {
      const code = await generateLecturerInvite(inviteEmail.trim())
      setLastCode(code)

      const emailed = await sendLecturerInviteEmail(inviteEmail.trim(), code)
      if (emailed) {
        toast(`Code emailed to ${inviteEmail}`, 'success')
      } else {
        toast('Code generated — EmailJS not configured, share manually', 'info')
      }

      setInvites(await getLecturerInvites())
      setInviteEmail('')
    } catch (err) {
      toast(err.message || 'Failed to generate code', 'error')
    } finally { setInviting(false) }
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code)
    toast('Code copied!', 'success')
  }

  /* ── Approve / Reject ── */
  async function handleApprove(uid) {
    setApproving(uid)
    try {
      await approveLecturer(uid)
      setLecturers(prev => prev.map(l => l.id===uid ? {...l,status:'approved'} : l))
      toast('Lecturer approved — they can now log in', 'success')
    } catch { toast('Failed to approve', 'error') }
    finally { setApproving(null) }
  }

  async function handleReject(uid) {
    try {
      await rejectLecturer(uid)
      setLecturers(prev => prev.map(l => l.id===uid ? {...l,status:'rejected'} : l))
      toast('Lecturer rejected', 'success')
    } catch { toast('Failed', 'error') }
  }

  /* ── Course assignment ── */
  async function handleSaveCourses(uid, courseIds) {
    try {
      await updateLecturerCourses(uid, courseIds)
      setLecturers(prev => prev.map(l => l.id===uid ? {...l,courses:courseIds} : l))
      toast('Course assignments updated', 'success')
      setCourseModal(null)
    } catch (err) { toast(err.message||'Failed', 'error') }
  }

  /* ── Delete lecturer ── */
  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteLecturer(confirmDelete.id)
      setLecturers(prev => prev.filter(l => l.id !== confirmDelete.id))
      toast('Lecturer account deleted', 'success')
      setConfirmDelete(null)
    } catch (err) { toast(err.message || 'Failed to delete', 'error') }
    finally { setDeleting(false) }
  }

  /* ── Courses dropdown cell ── */
  function CoursesDropdown({ courseIds }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
      if (!open) return
      function handleOutside(e) {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false)
      }
      document.addEventListener('mousedown', handleOutside)
      return () => document.removeEventListener('mousedown', handleOutside)
    }, [open])

    if (!courseIds?.length) return <span style={{ color:'#94a3b8', fontSize:'0.72rem' }}>—</span>
    const courses = courseIds.map(id => allCourses.find(x=>x.id===id)).filter(Boolean)
    const count   = courses.length
    return (
      <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
        <button onClick={()=>setOpen(o=>!o)}
          style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.22rem 0.6rem', borderRadius:99, background:'rgba(47,160,132,0.1)', color:'#2FA084', border:'1px solid rgba(47,160,132,0.25)', cursor:'pointer', fontFamily:'inherit', fontSize:'0.72rem', fontWeight:700 }}>
          {count} Course{count!==1?'s':''} <ChevronDown size={11} style={{ transition:'transform 0.2s', transform:open?'rotate(180deg)':'none' }}/>
        </button>
        {open && (
          <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:100, background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,0.12)', padding:'0.5rem', minWidth:160, display:'flex', flexDirection:'column', gap:'0.25rem' }}>
            {courses.map(c => (
              <div key={c.id} style={{ padding:'0.35rem 0.65rem', borderRadius:8, background:'#f8fafc' }}>
                <p style={{ margin:0, fontSize:'0.75rem', fontWeight:800, color:'#2FA084' }}>{c.code}</p>
                {c.title && <p style={{ margin:'1px 0 0', fontSize:'0.65rem', color:'#94a3b8', lineHeight:1.3 }}>{c.title}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const displayList = activeTab === 'registered' ? registered : pending

  return (
    <AdminLayout>
      {courseModal && (
        <CourseModal
          lecturer={courseModal}
          allCourses={allCourses}
          onClose={()=>setCourseModal(null)}
          onSave={handleSaveCourses}
        />
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' }}>
          <div style={{ width:'90vw', maxWidth:380, background:'#fff', borderRadius:18, boxShadow:'0 24px 80px rgba(0,0,0,0.2)', padding:'1.75rem 1.5rem', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', color:'#dc2626' }}>
              <Trash2 size={22}/>
            </div>
            <p style={{ margin:'0 0 0.35rem', fontWeight:800, fontSize:'0.97rem', color:'#0f172a' }}>Delete Lecturer?</p>
            <p style={{ margin:'0 0 1.5rem', fontSize:'0.82rem', color:'#64748b', lineHeight:1.55 }}>
              <strong>{confirmDelete.name}</strong> will be permanently removed and will no longer be able to log in.
            </p>
            <div style={{ display:'flex', gap:'0.65rem' }}>
              <button onClick={()=>setConfirmDelete(null)} disabled={deleting}
                style={{ flex:1, padding:'0.7rem', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex:1, padding:'0.7rem', borderRadius:10, border:'none', background:deleting?'rgba(239,68,68,0.4)':'#dc2626', color:'#fff', fontWeight:700, fontSize:'0.85rem', cursor:deleting?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                {deleting ? <Spinner size={14} color="white"/> : <Trash2 size={14}/>} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.25rem' }}>
          <AnimatedLabel text="Lecturers" Icon={GraduationCap} />
        </div>
        <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{profile?.name || 'Administrator'}</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">

        {/* ── Invite Card ── */}
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={15} className="text-brand-600"/>
            <p className="text-sm font-bold text-gray-800">Invite a Lecturer</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">A one-time authorization code is generated and emailed automatically. The code expires in 15 minutes and cannot be reused.</p>

          <form onSubmit={handleInvite} className="flex gap-2 mb-3">
            <input
              type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}
              placeholder="lecturer@school.edu.ng" required
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
              style={{ fontFamily:'inherit' }}
            />
            <button type="submit" disabled={inviting}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
              style={{ whiteSpace:'nowrap' }}>
              {inviting ? <Spinner size={13} color="white"/> : <Mail size={13}/>}
              {inviting ? 'Sending…' : 'Send Code'}
            </button>
          </form>

          {/* Last generated code */}
          {lastCode && (
            <div style={{ background:'rgba(47,160,132,0.06)', border:'1px solid rgba(47,160,132,0.25)', borderRadius:12, padding:'0.65rem 0.9rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem' }}>
              <div>
                <p style={{ margin:0, fontSize:'0.65rem', color:'#64748b', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>Generated Code</p>
                <p style={{ margin:'0.2rem 0 0', fontSize:'1rem', fontWeight:900, color:'#2FA084', letterSpacing:'0.14em', fontFamily:'monospace' }}>{lastCode}</p>
              </div>
              <button onClick={()=>copyCode(lastCode)}
                style={{ padding:'0.45rem 0.75rem', borderRadius:8, border:'1px solid rgba(47,160,132,0.3)', background:'rgba(47,160,132,0.08)', color:'#2FA084', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'0.3rem', fontFamily:'inherit' }}>
                <Copy size={12}/> Copy
              </button>
            </div>
          )}

          {!emailJsConfigured() && (
            <p style={{ margin:'0.65rem 0 0', fontSize:'0.68rem', color:'#f59e0b', display:'flex', alignItems:'flex-start', gap:'0.3rem', lineHeight:1.45 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} style={{ width:13,height:13,flexShrink:0,marginTop:1 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
              EmailJS not configured — codes are generated but not auto-emailed. Copy and share manually, or add <code style={{ fontSize:'0.65rem', background:'#fef3c7', padding:'0.1rem 0.3rem', borderRadius:4 }}>VITE_EMAILJS_*</code> keys to .env.local.
            </p>
          )}
        </div>

        {/* ── Recent Invites ── */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={14} className="text-gray-400"/>
            <p className="text-sm font-bold text-gray-700">Recent Invites</p>
          </div>
          {invites.length === 0 ? (
            <p className="text-xs text-gray-400">No invites sent yet.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
              {invites.slice(0,5).map(inv => (
                <div key={inv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.55rem 0.75rem', borderRadius:10, background:'#f8fafc', border:'1px solid #f1f5f9' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:'0.78rem', fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.email}</p>
                    <p style={{ margin:'0.1rem 0 0', fontSize:'0.65rem', color:'#94a3b8' }}>{timeAgo(inv.created_at)}</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexShrink:0 }}>
                    <span style={{ fontSize:'0.63rem', fontWeight:700, padding:'0.12rem 0.5rem', borderRadius:99, background:inv.used?'rgba(34,197,94,0.1)':new Date(inv.expires_at)<new Date()?'rgba(239,68,68,0.1)':'rgba(251,191,36,0.1)', color:inv.used?'#16a34a':new Date(inv.expires_at)<new Date()?'#dc2626':'#d97706' }}>
                      {inv.used ? 'Used' : expiresIn(inv.expires_at)}
                    </span>
                    {!inv.used && new Date(inv.expires_at)>new Date() && (
                      <button onClick={()=>copyCode(inv.code)} style={{ padding:'0.2rem 0.45rem', borderRadius:6, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', color:'#64748b' }}>
                        <Copy size={11}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
        {[
          { id:'registered', label:`Registered (${registered.length})` },
          { id:'pending',    label:`Pending Approval (${pending.length})` },
        ].map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab===t.id?'bg-white text-brand-700 shadow-sm':'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={24} color="brand"/></div>
        ) : displayList.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No {activeTab} lecturers yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-sm" style={{ minWidth: 520 }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Lecturer','Courses','Status','Actions',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayList.map(l => (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                          {initials(l.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p className="font-semibold text-gray-900 text-sm" style={{ whiteSpace: 'nowrap' }}>{l.name}</p>
                          <p className="text-xs text-gray-400" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CoursesDropdown courseIds={l.courses}/>
                    </td>
                    <td className="px-4 py-3"><Badge status={l.status}/></td>
                    <td className="px-4 py-3">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
                        <button onClick={()=>setCourseModal(l)}
                          style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.3rem 0.65rem', borderRadius:8, border:'1px solid rgba(47,160,132,0.35)', background:'rgba(47,160,132,0.06)', color:'#2FA084', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', whiteSpace:'nowrap' }}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(47,160,132,0.12)'}
                          onMouseLeave={e=>e.currentTarget.style.background='rgba(47,160,132,0.06)'}>
                          <BookOpen size={11}/> Courses
                        </button>
                        {l.status === 'pending' && (
                          <>
                            <button onClick={()=>handleApprove(l.id)} disabled={approving===l.id}
                              style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.3rem 0.65rem', borderRadius:8, border:'1px solid rgba(34,197,94,0.35)', background:'rgba(34,197,94,0.06)', color:'#16a34a', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                              {approving===l.id ? <Spinner size={11} color="brand"/> : <CheckCircle size={11}/>} Approve
                            </button>
                            <button onClick={()=>handleReject(l.id)}
                              style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.3rem 0.65rem', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.05)', color:'#dc2626', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                              <XCircle size={11}/> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={()=>setConfirmDelete(l)} title="Delete lecturer"
                        style={{ padding:'0.3rem 0.5rem', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.05)', color:'#dc2626', cursor:'pointer', display:'flex', alignItems:'center', transition:'all 0.15s' }}
                        onMouseEnter={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.5)' }}
                        onMouseLeave={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.05)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.3)' }}>
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


    </AdminLayout>
  )
}
