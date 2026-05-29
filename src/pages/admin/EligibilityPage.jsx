import { useState, useEffect } from 'react'
import { ShieldCheck, Printer, Download } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getCourses, getSettings } from '@/services/courseService'
import { getCourseAttendance, getEnrolledStudents } from '@/services/studentService'
import { Spinner } from '@/components/ui/Spinner'
import { normalizeLevel, levelFromCourseCode } from '@/utils'
import logoSrc from '@/assets/gaposa-logo.png'

async function getLogoDataUrl() {
  try {
    const res = await fetch(logoSrc)
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return '' }
}

async function printEligibility(course, rows, settings) {
  const logo = await getLogoDataUrl()
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const eligible = rows.filter(r => r.eligible).length
  const barred   = rows.filter(r => !r.eligible && r.total > 0).length

  const tableRows = rows.map((r, i) => `
    <tr>
      <td style="text-align:center;color:#6b7280">${i + 1}</td>
      <td style="font-family:monospace;font-size:11px">${r.matric}</td>
      <td><strong>${r.name}</strong></td>
      <td style="text-align:center">${r.present}</td>
      <td style="text-align:center">${r.total}</td>
      <td style="text-align:center;font-weight:800;color:${r.pct >= 75 ? '#16a34a' : r.pct > 0 ? '#dc2626' : '#9ca3af'}">${r.total > 0 ? r.pct + '%' : '—'}</td>
      <td style="text-align:center">
        <span style="padding:3px 12px;border-radius:99px;font-size:10px;font-weight:800;
          background:${r.total === 0 ? '#f1f5f9' : r.eligible ? '#dcfce7' : '#fee2e2'};
          color:${r.total === 0 ? '#94a3b8' : r.eligible ? '#166534' : '#991b1b'}">
          ${r.total === 0 ? 'No Records' : r.eligible ? '✓ ELIGIBLE' : '✗ BARRED'}
        </span>
      </td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Exam Eligibility — ${course.code}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;padding:36px 44px;color:#111;font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:14px}
    th{background:#1F6F5F;color:#fff;padding:8px 12px;text-align:left;font-size:10px;letter-spacing:.07em;text-transform:uppercase}
    td{padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
    tr:nth-child(even) td{background:#f9fafb}
    .hdr{display:flex;align-items:center;gap:20px;padding-bottom:16px;margin-bottom:20px;border-bottom:3px solid #1F6F5F}
    .meta{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .meta-item p{margin:0}.meta-label{font-size:9px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.1em}
    .meta-val{font-size:14px;font-weight:800;color:#111;margin-top:2px!important}
    .summary{display:flex;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px}
    .sum-cell{flex:1;padding:12px 16px;text-align:center;border-right:1px solid #e2e8f0}
    .sum-cell:last-child{border-right:none}
    .sum-val{font-size:22px;font-weight:900;margin:0;line-height:1}
    .sum-lbl{font-size:9px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin:3px 0 0}
    .foot{margin-top:28px;font-size:10px;color:#9ca3af;border-top:2px solid #1F6F5F;padding-top:10px;display:flex;justify-content:space-between}
    @media print{body{padding:24px 32px}}
  </style></head><body>
  <div class="hdr">
    ${logo ? `<img src="${logo}" style="width:72px;height:72px;object-fit:contain" alt="Logo"/>` : ''}
    <div>
      <h1 style="margin:0;font-size:19px;font-weight:900;color:#1F6F5F;text-transform:uppercase;letter-spacing:-.01em">GATEWAY ICT POLYTECHNIC</h1>
      <p style="margin:2px 0 0;font-size:10px;color:#6b7280">Saapade, Ogun State, Nigeria</p>
      <p style="margin:5px 0 0;font-size:11px;font-weight:800;color:#1e3a5f">Dept. of Electrical / Electronics Engineering</p>
      <p style="margin:2px 0 0;font-size:10px;color:#2FA084;font-weight:700">EEE FACE-ID — Exam Eligibility Report</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><p class="meta-label">Course Code</p><p class="meta-val">${course.code}</p></div>
    <div class="meta-item"><p class="meta-label">Course Title</p><p class="meta-val" style="font-size:11px">${course.title || '—'}</p></div>
    <div class="meta-item"><p class="meta-label">Session</p><p class="meta-val">${settings.session || '—'}</p></div>
    <div class="meta-item"><p class="meta-label">Date Printed</p><p class="meta-val" style="font-size:11px">${date}</p></div>
  </div>

  <div class="summary">
    <div class="sum-cell"><p class="sum-val" style="color:#2563eb">${rows.length}</p><p class="sum-lbl">Total Students</p></div>
    <div class="sum-cell"><p class="sum-val" style="color:#16a34a">${eligible}</p><p class="sum-lbl">Eligible (≥75%)</p></div>
    <div class="sum-cell"><p class="sum-val" style="color:#dc2626">${barred}</p><p class="sum-lbl">Barred (<75%)</p></div>
    <div class="sum-cell"><p class="sum-val" style="color:#9ca3af">${rows.filter(r => r.total === 0).length}</p><p class="sum-lbl">No Records</p></div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Matric</th><th>Name</th><th style="text-align:center">Present</th><th style="text-align:center">Total</th><th style="text-align:center">Attendance</th><th style="text-align:center">Eligibility</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>

  <p style="margin:10px 0 0;font-size:10px;color:#9ca3af">Minimum attendance required for exam eligibility: <strong>75%</strong></p>

  <div class="foot">
    <span>Gateway ICT Polytechnic · EEE Dept. · EEE FACE-ID System</span>
    <span>Printed: ${date}</span>
  </div>
  </body></html>`

  const printable = html.replace('</body>', `<script>window.onload=function(){window.print()}<\/script></body>`)
  const blob = new Blob([printable], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const w    = window.open(url, '_blank')
  if (!w) { const a = document.createElement('a'); a.href = url; a.download = `eligibility-${course.code}.html`; a.click() }
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export default function EligibilityPage() {
  const [courses,     setCourses]     = useState([])
  const [students,    setStudents]    = useState([])
  const [settings,    setSettings]    = useState({})
  const [selectedId,  setSelectedId]  = useState('')
  const [records,     setRecords]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [printing,    setPrinting]    = useState(false)

  useEffect(() => {
    Promise.all([getCourses(), getEnrolledStudents(), getSettings()])
      .then(([c, s, st]) => {
        setCourses(c); setStudents(s); setSettings(st)
        if (c.length) setSelectedId(c[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoadingRecs(true)
    getCourseAttendance(selectedId).then(setRecords).finally(() => setLoadingRecs(false))
  }, [selectedId])

  const course = courses.find(c => c.id === selectedId)
  const courseLevel = course ? (levelFromCourseCode(course.code) || normalizeLevel(course.level)) : null
  const courseStudents = students.filter(s => normalizeLevel(s.level) === normalizeLevel(courseLevel))

  const rows = courseStudents.map(s => {
    const sr      = records.filter(r => r.matric === s.matric)
    const present = sr.filter(r => r.status === 'present' || r.present).length
    const total   = sr.length
    const pct     = total > 0 ? Math.round((present / total) * 100) : 0
    return { ...s, present, total, pct, eligible: total > 0 && pct >= 75 }
  }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))

  const eligible = rows.filter(r => r.eligible).length
  const barred   = rows.filter(r => !r.eligible && r.total > 0).length

  const CARD = { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, boxShadow: '0 2px 12px rgba(31,111,95,0.07)', padding: '1rem 1.25rem' }

  return (
    <AdminLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.65rem' }}>
          <div>
            <div style={{ marginBottom: '0.25rem' }}><AnimatedLabel text="Eligibility" Icon={ShieldCheck} /></div>
            <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 }}>Exam Eligibility Report</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              disabled={printing || !course || rows.length === 0}
              onClick={async () => { setPrinting(true); try { await printEligibility(course, rows, settings) } finally { setPrinting(false) } }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', borderRadius: 10, border: 'none', background: printing || !course ? '#94a3b8' : '#1F6F5F', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: printing || !course ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {printing ? <Spinner size={13} color="white" /> : <Printer size={13} />}
              {printing ? 'Preparing…' : 'Print / PDF'}
            </button>
          </div>
        </div>

        {/* Course selector */}
        <div style={{ ...CARD, marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: '0.4rem' }}>Select Course</label>
          {loading ? <Spinner size={18} color="brand" /> : (
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.88rem', color: '#1e293b', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title} ({levelFromCourseCode(c.code) || c.level})</option>)}
            </select>
          )}
        </div>

        {/* Summary cards */}
        {!loading && course && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
              {[
                { label: 'Total Students', val: rows.length,   color: '#2563eb', bg: '#dbeafe' },
                { label: 'Eligible ≥75%',  val: eligible,      color: '#16a34a', bg: '#dcfce7' },
                { label: 'Barred <75%',    val: barred,        color: '#dc2626', bg: '#fee2e2' },
                { label: 'No Records',     val: rows.filter(r => r.total === 0).length, color: '#9ca3af', bg: '#f1f5f9' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} style={{ ...CARD, textAlign: 'center', padding: '0.85rem' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: bg, margin: '0 auto 0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1 }}>{val}</p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}>
              {loadingRecs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner size={24} color="brand" /></div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['#', 'Matric', 'Student Name', 'Present', 'Total', 'Attendance %', 'Eligibility'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.7rem 1rem', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.85rem' }}>No students enrolled for this course level</td></tr>
                    ) : rows.map((r, i) => (
                      <tr key={r.matric} style={{ borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.72rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{i + 1}</td>
                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{r.matric}</td>
                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{r.name}</td>
                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#16a34a', fontWeight: 700 }}>{r.present}</td>
                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#64748b' }}>{r.total}</td>
                        <td style={{ padding: '0.7rem 1rem', fontSize: '0.88rem', fontWeight: 800, color: r.total === 0 ? '#94a3b8' : r.pct >= 75 ? '#16a34a' : r.pct >= 50 ? '#d97706' : '#dc2626' }}>
                          {r.total > 0 ? `${r.pct}%` : '—'}
                        </td>
                        <td style={{ padding: '0.7rem 1rem' }}>
                          {r.total === 0 ? (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '3px 10px', borderRadius: 99 }}>No Records</span>
                          ) : r.eligible ? (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: 99 }}>✓ ELIGIBLE</span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '3px 10px', borderRadius: 99 }}>✗ BARRED</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ padding: '0.65rem 1rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                  Minimum 75% attendance required · {course.code} · {settings.session} · {settings.semester}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
