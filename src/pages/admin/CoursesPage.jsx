import { useState, useEffect } from 'react'
import { Layers, Plus, Trash2, X, Check, Search } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getCourses, createCourse, deleteCourse } from '@/services/courseService'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'

export default function CoursesPage() {
  const [courses,       setCourses]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [adding,        setAdding]        = useState(false)
  const [form,          setForm]          = useState({ code: '', title: '' })
  const [saving,        setSaving]        = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(false)
  const [search,        setSearch]        = useState('')
  const { toast } = useToast()

  useEffect(() => {
    getCourses().then(setCourses).finally(() => setLoading(false))
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.code.trim()) return
    setSaving(true)
    try {
      const id = await createCourse({ code: form.code.trim().toUpperCase(), title: form.title.trim() })
      setCourses(prev => [...prev, { id, code: form.code.trim().toUpperCase(), title: form.title.trim() }])
      setForm({ code: '', title: '' })
      setAdding(false)
      toast(`Course ${form.code.toUpperCase()} added`, 'success')
    } catch (err) {
      toast(err.message || 'Failed to add course', 'error')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteCourse(confirmDelete.id)
      setCourses(prev => prev.filter(c => c.id !== confirmDelete.id))
      toast(`Course ${confirmDelete.code} removed`, 'success')
      setConfirmDelete(null)
    } catch (err) {
      toast(err.message || 'Failed to remove course', 'error')
    } finally { setDeleting(false) }
  }

  return (
    <AdminLayout>
      {/* Delete confirm modal */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' }}>
          <div style={{ width:'90vw', maxWidth:380, background:'#fff', borderRadius:18, boxShadow:'0 24px 80px rgba(0,0,0,0.2)', padding:'1.75rem 1.5rem', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', color:'#dc2626' }}>
              <Trash2 size={22}/>
            </div>
            <p style={{ margin:'0 0 0.35rem', fontWeight:800, fontSize:'0.97rem', color:'#0f172a' }}>Remove Course?</p>
            <p style={{ margin:'0 0 1.5rem', fontSize:'0.82rem', color:'#64748b', lineHeight:1.55 }}>
              <strong>{confirmDelete.code}</strong>{confirmDelete.title ? ` — ${confirmDelete.title}` : ''} will be removed. Existing attendance records are not affected.
            </p>
            <div style={{ display:'flex', gap:'0.65rem' }}>
              <button onClick={()=>setConfirmDelete(null)} disabled={deleting}
                style={{ flex:1, padding:'0.7rem', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex:1, padding:'0.7rem', borderRadius:10, border:'none', background:deleting?'rgba(239,68,68,0.4)':'#dc2626', color:'#fff', fontWeight:700, fontSize:'0.85rem', cursor:deleting?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                {deleting ? <Spinner size={14} color="white"/> : <Trash2 size={14}/>} Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:'1.5rem', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <div style={{ marginBottom:'0.25rem' }}>
            <AnimatedLabel text="Courses" Icon={Layers} />
          </div>
          <h1 style={{ margin:'0.2rem 0 0', color:'#1e293b', fontSize:'1.25rem', fontWeight:900, lineHeight:1.15, letterSpacing:'-0.01em' }}>
            Manage Courses
          </h1>
        </div>
        <button onClick={()=>{ setAdding(a=>!a); setForm({ code:'', title:'' }) }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'0.65rem 1.1rem', borderRadius:12, border:'none', background:adding?'#f1f5f9':'#1F6F5F', color:adding?'#64748b':'#fff', fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
          {adding ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Add Course</>}
        </button>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:'0.85rem' }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by code or title…"
          style={{ width:'100%', padding:'0.68rem 0.9rem 0.68rem 2.25rem', borderRadius:12, border:'1.5px solid #e2e8f0', fontSize:'0.85rem', color:'#1e293b', outline:'none', fontFamily:'inherit', background:'#fff', boxSizing:'border-box', transition:'border-color 0.2s' }}
          onFocus={e=>e.target.style.borderColor='#2FA084'}
          onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
        {search && (
          <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', padding:2 }}>
            <X size={13}/>
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background:'#fff', border:'1px solid #f1f5f9', borderRadius:18, boxShadow:'0 2px 12px rgba(31,111,95,0.07)', padding:'1.25rem 1.5rem', marginBottom:'1rem' }}>
          <p style={{ margin:'0 0 0.85rem', fontWeight:700, fontSize:'0.88rem', color:'#1e293b' }}>New Course</p>
          <form onSubmit={handleAdd} style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
              <label style={{ fontSize:'0.68rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.08em' }}>Course Code *</label>
              <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} required
                placeholder="e.g. EEC 211"
                style={{ padding:'0.65rem 0.9rem', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:'0.85rem', color:'#1e293b', outline:'none', fontFamily:'inherit', width:140, boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#2FA084'}
                onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem', flex:1, minWidth:200 }}>
              <label style={{ fontSize:'0.68rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.08em' }}>Course Title</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                placeholder="e.g. Electrical Circuit Theory"
                style={{ padding:'0.65rem 0.9rem', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:'0.85rem', color:'#1e293b', outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#2FA084'}
                onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            </div>
            <button type="submit" disabled={saving}
              style={{ padding:'0.65rem 1.2rem', borderRadius:10, border:'none', background:saving?'rgba(47,160,132,0.4)':'#2FA084', color:'#fff', fontWeight:700, fontSize:'0.85rem', cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'0.4rem', whiteSpace:'nowrap' }}>
              {saving ? <Spinner size={14} color="white"/> : <Check size={14}/>} Add Course
            </button>
          </form>
        </div>
      )}

      {/* Course list */}
      <div style={{ background:'#fff', border:'1px solid #f1f5f9', borderRadius:18, boxShadow:'0 2px 12px rgba(31,111,95,0.07)', overflow:'hidden', padding:0 }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><Spinner size={24} color="brand"/></div>
        ) : courses.length === 0 ? (
          <p style={{ textAlign:'center', color:'#94a3b8', fontSize:'0.85rem', padding:'3rem 1.5rem' }}>No courses yet. Add the first one above.</p>
        ) : (
          <div style={{ overflowX:'auto' }}>
            {(() => {
              const q = search.trim().toLowerCase()
              const visible = q ? courses.filter(c => c.code.toLowerCase().includes(q) || (c.title||'').toLowerCase().includes(q)) : courses
              return (<>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
                  {['#','Code','Title',''].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'0.75rem 1.25rem', fontSize:'0.7rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding:'2rem', textAlign:'center', color:'#94a3b8', fontSize:'0.85rem' }}>No courses match "{search}"</td></tr>
                ) : visible.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f8fafc' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'0.9rem 1.25rem', fontSize:'0.8rem', color:'#94a3b8', fontWeight:600, width:40 }}>{i+1}</td>
                    <td style={{ padding:'0.9rem 1.25rem' }}>
                      <span style={{ fontSize:'0.82rem', fontWeight:800, padding:'0.22rem 0.7rem', borderRadius:99, background:'rgba(47,160,132,0.1)', color:'#2FA084', border:'1px solid rgba(47,160,132,0.25)' }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={{ padding:'0.9rem 1.25rem', fontSize:'0.85rem', color:'#374151', fontWeight:500 }}>
                      {c.title || <span style={{ color:'#d1d5db', fontStyle:'italic' }}>No title</span>}
                    </td>
                    <td style={{ padding:'0.9rem 1.25rem', textAlign:'right' }}>
                      <button onClick={()=>setConfirmDelete(c)} title="Remove course"
                        style={{ padding:'0.32rem 0.52rem', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.05)', color:'#dc2626', cursor:'pointer', display:'inline-flex', alignItems:'center', transition:'all 0.15s' }}
                        onMouseEnter={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.5)' }}
                        onMouseLeave={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.05)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.3)' }}>
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding:'0.65rem 1.25rem', borderTop:'1px solid #f8fafc', background:'#fafafa' }}>
              <p style={{ margin:0, fontSize:'0.72rem', color:'#94a3b8' }}>
                {q && visible.length !== courses.length ? `${visible.length} of ${courses.length} courses` : `${courses.length} course${courses.length!==1?'s':''} total`}
              </p>
            </div>
            </>)})()}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
