import { useState, useEffect, useRef } from 'react'
import { FileText, Upload, X, Clock, CheckCircle, XCircle, Plus, Trash2, Paperclip, CalendarX2, Printer, ClipboardX } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { submitAbsenceRequest, getMyAbsenceRequests, uploadAbsenceDocument } from '@/services/studentService'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AnimatedTitle } from '@/components/ui/AnimatedTitle'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'

const REASON_TYPES = [
  { id: 'sickness', label: 'Sickness / Medical',    desc: 'Hospital visit, illness, medical procedure' },
  { id: 'police',   label: 'Police / Legal Matter', desc: 'Police report, court summons, legal obligation' },
  { id: 'other',    label: 'Other Emergency',        desc: 'Bereavement, family emergency, other valid reason' },
]

const CARD = {
  background: '#fff',
  border: '1px solid #f1f5f9',
  borderRadius: 20,
  boxShadow: '0 2px 12px rgba(31,111,95,0.07)',
}

const INPUT = {
  width: '100%',
  background: '#f9fafb',
  border: '1.5px solid #e5e7eb',
  borderRadius: 10,
  padding: '0.65rem 0.9rem',
  color: '#1f2937',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

function StatusBadge({ status }) {
  const cfg = {
    approved: { bg: '#dcfce7', color: '#16a34a', Icon: CheckCircle },
    rejected: { bg: '#fee2e2', color: '#dc2626', Icon: XCircle },
    pending:  { bg: '#fef9c3', color: '#d97706', Icon: Clock },
  }
  const { bg, color, Icon } = cfg[status] || cfg.pending
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, background: bg, color, fontSize: '0.7rem', fontWeight: 700, padding: '0.22rem 0.65rem', borderRadius: 99 }}>
      <Icon size={11} />{(status || 'pending').charAt(0).toUpperCase() + (status || 'pending').slice(1)}
    </span>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TYPE_COLOR = { sickness: '#2563eb', police: '#7c3aed', other: '#d97706' }
const TYPE_BG    = { sickness: '#dbeafe', police: '#ede9fe',  other: '#fef9c3' }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function StudentAbsence() {
  const { profile } = useAuthStore()
  const { toast }   = useToast()
  const fileRef     = useRef(null)

  const matric      = profile?.matric || sessionStorage.getItem('studentMatric')
  const studentName = profile?.name   || sessionStorage.getItem('studentName') || 'Student'
  const firstName   = studentName.split(' ')[0]

  const [tab,        setTab]        = useState('requests')
  const [requests,   setRequests]   = useState([])
  const [loadingReq, setLoadingReq] = useState(true)
  const [expanded,   setExpanded]   = useState(null)
  const [student,    setStudent]    = useState(null)

  const [reasonType,   setReasonType]   = useState('sickness')
  const [description,  setDescription]  = useState('')
  const [absenceDates, setAbsenceDates] = useState([''])
  const [file,         setFile]         = useState(null)
  const [submitting,   setSubmitting]   = useState(false)

  function loadRequests() {
    setLoadingReq(true)
    getMyAbsenceRequests(matric).then(setRequests).finally(() => setLoadingReq(false))
  }
  useEffect(() => {
    if (!matric) return
    Promise.all([
      getMyAbsenceRequests(matric),
      supabase.from('students').select('level, option').eq('matric', matric).single(),
    ]).then(([reqs, { data }]) => {
      setRequests(reqs)
      if (data) setStudent(data)
    }).finally(() => setLoadingReq(false))
  }, [matric])

  const addDate    = ()        => setAbsenceDates(d => [...d, ''])
  const updateDate = (i, val) => setAbsenceDates(d => d.map((v, idx) => idx === i ? val : v))
  const removeDate = i        => setAbsenceDates(d => d.filter((_, idx) => idx !== i))

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast('File must be under 5 MB', 'error'); return }
    setFile(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validDates = absenceDates.filter(Boolean)
    if (!validDates.length) { toast('Add at least one absence date', 'error'); return }
    if (!description.trim()) { toast('Please describe the reason', 'error'); return }
    setSubmitting(true)
    try {
      let docUrl = null, docName = null
      if (file) { const up = await uploadAbsenceDocument(matric, file); docUrl = up.url; docName = up.name }
      await submitAbsenceRequest({ matric, student_name: studentName, reason_type: reasonType, description: description.trim(), absence_dates: validDates, document_url: docUrl, document_name: docName })
      toast('Request submitted successfully', 'success')
      setReasonType('sickness'); setDescription(''); setAbsenceDates(['']); setFile(null)
      setTab('requests')
      getMyAbsenceRequests(matric).then(setRequests)
    } catch (err) {
      toast(err.message || 'Failed to submit request', 'error')
    } finally { setSubmitting(false) }
  }

  function handlePrint() {
    const validDates = absenceDates.filter(Boolean)
    const reasonLabel = REASON_TYPES.find(r => r.id === reasonType)?.label || reasonType
    const html = `<!DOCTYPE html><html><head><title>Absence Request — ${studentName}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:40px;color:#1f2937;background:#fff}
      h1{font-size:22px;margin:0 0 4px}
      .sub{color:#6b7280;font-size:13px;margin:0 0 24px}
      .badge{display:inline-block;background:#fef9c3;color:#d97706;border-radius:99px;padding:2px 12px;font-size:11px;font-weight:700;margin-right:6px}
      .badge.opt{background:#e5e7eb;color:#374151}
      .section{margin-bottom:20px;border:1px solid #e5e7eb;border-radius:10px;padding:16px}
      .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;margin:0 0 6px}
      .value{font-size:14px;color:#1f2937;margin:0;line-height:1.6}
      .date-chip{display:inline-block;background:#f3f4f6;border-radius:99px;padding:2px 10px;font-size:13px;margin:2px}
      .footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:11px;color:#9ca3af}
      @media print{body{padding:20px}}
    </style></head><body>
    <h1>Absence Request Form</h1>
    <p class="sub">Gateway ICT Polytechnic · EEE FACE-ID</p>
    <div class="section">
      <p class="label">Student Details</p>
      <p class="value" style="font-size:16px;font-weight:700;margin-bottom:6px">${studentName}</p>
      <p class="value" style="color:#6b7280;margin-bottom:8px">${matric}</p>
      ${student?.level ? `<span class="badge">${student.level}</span>` : ''}
      ${student?.option ? `<span class="badge opt">${student.option}</span>` : ''}
    </div>
    <div class="section">
      <p class="label">Type of Absence</p>
      <p class="value">${reasonLabel}</p>
    </div>
    <div class="section">
      <p class="label">Date(s) of Absence</p>
      <div>${validDates.length ? validDates.map(d => `<span class="date-chip">${d}</span>`).join('') : '<span style="color:#9ca3af">No dates entered</span>'}</div>
    </div>
    <div class="section">
      <p class="label">Description</p>
      <p class="value">${description.trim() || '<span style="color:#9ca3af">No description entered</span>'}</p>
    </div>
    ${file ? `<div class="section"><p class="label">Supporting Document</p><p class="value">${file.name} (will be uploaded on submission)</p></div>` : ''}
    <div class="footer">
      <p>Printed: ${new Date().toLocaleString()} &nbsp;|&nbsp; This is a draft — submit via the student portal to make it official.</p>
    </div>
    </body></html>`
    const w = window.open('', '_blank', 'width=820,height=700')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <StudentLayout>
      {/* Header */}
      <div style={{ marginBottom: '5.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ marginBottom: '0.25rem' }}>
              <AnimatedLabel text="Absence Requests" Icon={CalendarX2} />
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

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 5, background: '#e8edf0', border: '1px solid #e2e8f0', borderRadius: 16, padding: 5, marginBottom: '1.5rem' }}>
        {[{ id: 'requests', label: 'My Requests' }, { id: 'new', label: '+ New Request' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '0.6rem', borderRadius: 12, border: 'none', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s', fontFamily: 'inherit',
            background: tab === t.id ? '#1F6F5F' : 'transparent',
            color:      tab === t.id ? '#fff' : '#94a3b8',
            boxShadow:  tab === t.id ? '0 2px 10px rgba(31,111,95,0.25)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── My Requests ── */}
      {tab === 'requests' && (
        loadingReq ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
            <Spinner size={32} color="white" />
          </div>
        ) : !requests.length ? (
          <div style={{ ...CARD, padding: '4rem 2rem', textAlign: 'center' }}>
            <CalendarX2 size={40} color="#2FA084" strokeWidth={1.5} style={{ margin: '0 auto 1rem', opacity: 0.55 }} />
            <p style={{ color: '#374151', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>No absence requests yet</p>
            <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '0.4rem 0 1.5rem' }}>Submit a request when you miss class due to a valid reason.</p>
            <button onClick={() => setTab('new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.4rem', borderRadius: 10, background: '#2FA084', color: '#fff', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,160,132,0.35)', fontFamily: 'inherit' }}>
              <Plus size={14} /> New Request
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {requests.map(req => {
              const color = TYPE_COLOR[req.reason_type] || '#d97706'
              const bg    = TYPE_BG[req.reason_type]   || '#fef9c3'
              return (
                <div key={req.id} style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                  <button onClick={() => setExpanded(expanded === req.id ? null : req.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem 1.2rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={19} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#1f2937', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{REASON_TYPES.find(r => r.id === req.reason_type)?.label || req.reason_type}</p>
                      <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0.15rem 0 0' }}>Submitted {fmt(req.created_at)}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </button>

                  {expanded === req.id && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div>
                        <p style={{ color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Absence Dates</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(req.absence_dates || []).map((d, i) => (
                            <span key={i} style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.78rem', fontWeight: 600, padding: '0.2rem 0.7rem', borderRadius: 99 }}>{d}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p style={{ color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Description</p>
                        <p style={{ color: '#374151', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{req.description}</p>
                      </div>
                      {req.document_url && (
                        <div>
                          <p style={{ color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Supporting Document</p>
                          <a href={req.document_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#2563eb', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                            <Paperclip size={13} /> {req.document_name || 'View Document'}
                          </a>
                        </div>
                      )}
                      {req.admin_note && (
                        <div style={{ padding: '0.7rem 0.9rem', borderRadius: 12, background: req.status === 'approved' ? '#f0fdf4' : req.status === 'rejected' ? '#fff1f2' : '#f9fafb', border: `1px solid ${req.status === 'approved' ? '#bbf7d0' : req.status === 'rejected' ? '#fecaca' : '#e5e7eb'}` }}>
                          <p style={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Admin Note</p>
                          <p style={{ color: '#374151', fontSize: '0.85rem', margin: 0 }}>{req.admin_note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── New Request Form ── */}
      {tab === 'new' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div style={{ ...CARD, padding: '1.4rem' }}>
            <p style={{ color: '#1f2937', fontWeight: 700, fontSize: '0.78rem', margin: '0 0 1rem', fontFamily: "'Albert Sans', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55 }}>Reason for Absence</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {REASON_TYPES.map(rt => (
                <label key={rt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '0.9rem 1rem', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', border: `1.5px solid ${reasonType === rt.id ? TYPE_COLOR[rt.id] : '#e5e7eb'}`, background: reasonType === rt.id ? TYPE_BG[rt.id] : '#fff' }}>
                  <input type="radio" name="reasonType" value={rt.id} checked={reasonType === rt.id} onChange={() => setReasonType(rt.id)} style={{ marginTop: 4, flexShrink: 0, accentColor: TYPE_COLOR[rt.id] }} />
                  <div>
                    <p style={{ color: '#1f2937', fontSize: '0.92rem', fontWeight: 700, margin: 0, fontFamily: "'Albert Sans', sans-serif", letterSpacing: '0.02em' }}>{rt.label}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.78rem', margin: '0.2rem 0 0', fontFamily: "'Albert Sans', sans-serif", lineHeight: 1.5 }}>{rt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, padding: '1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <p style={{ color: '#1f2937', fontWeight: 700, fontSize: '0.78rem', margin: 0, fontFamily: "'Albert Sans', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55 }}>Date(s) of Absence</p>
              <button type="button" onClick={addDate} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={13} /> Add Date
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {absenceDates.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="date" value={d} onChange={e => updateDate(i, e.target.value)} max={new Date().toISOString().split('T')[0]} style={INPUT} />
                  {absenceDates.length > 1 && (
                    <button type="button" onClick={() => removeDate(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, padding: '1.4rem' }}>
            <p style={{ color: '#1f2937', fontWeight: 700, fontSize: '0.78rem', margin: '0 0 0.75rem', fontFamily: "'Albert Sans', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55 }}>Description</p>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what happened and why you were absent…" rows={4} required style={{ ...INPUT, resize: 'none', lineHeight: 1.65 }} />
          </div>

          <div style={{ ...CARD, padding: '1.4rem' }}>
            <p style={{ color: '#1f2937', fontWeight: 700, fontSize: '0.78rem', margin: '0 0 0.3rem', fontFamily: "'Albert Sans', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55 }}>Supporting Document</p>
            <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '0 0 1rem' }}>PDF, JPG, PNG — max 5 MB (optional but recommended)</p>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ display: 'none' }} />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 12, background: '#dbeafe', border: '1.5px solid #93c5fd' }}>
                <Paperclip size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                <p style={{ color: '#1d4ed8', fontSize: '0.85rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{file.name}</p>
                <button type="button" onClick={() => { setFile(null); fileRef.current.value = '' }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current.click()} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '1.75rem', borderRadius: 14, border: '2px dashed #d1d5db', background: '#fafafa', cursor: 'pointer', color: '#9ca3af', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2FA084'; e.currentTarget.style.color = '#2FA084'; e.currentTarget.style.background = 'rgba(47,160,132,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = '#fafafa' }}
              >
                <Upload size={22} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Click to upload document</span>
                <span style={{ fontSize: '0.75rem' }}>Optional but strongly recommended</span>
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button type="button" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0.95rem', borderRadius: 14, background: '#f8fafc', color: '#475569', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'inherit', letterSpacing: '0.04em', border: '1.5px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
            >
              <Printer size={15} /> Preview &amp; Print
            </button>
            <button type="submit" disabled={submitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0.95rem', borderRadius: 14, background: submitting ? 'rgba(47,160,132,0.45)' : 'linear-gradient(135deg,#2FA084,#1F6F5F)', color: '#fff', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'inherit', letterSpacing: '0.04em', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 4px 14px rgba(47,160,132,0.35)', transition: 'all 0.18s' }}>
              {submitting ? <><Spinner size={16} color="#000" /> Submitting…</> : 'Submit Request'}
            </button>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', paddingBottom: '0.5rem' }}>
            Requests are reviewed by the EEE department admin.
          </p>
        </form>
      )}
    </StudentLayout>
  )
}
