import * as XLSX from 'xlsx'
import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Printer, Search, Filter, Calendar, Clock, X, BookOpen } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { useAuthStore } from '@/store/authStore'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getMasterList, uploadMasterList, clearMasterList } from '@/services/studentService'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { parseExcelStudentList, LEVELS, formatDate, formatTime } from '@/utils'

export default function MasterListPage() {
  const { profile } = useAuthStore()
  const [list,        setList]        = useState([])
  const [filtered,    setFiltered]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [uploading,   setUploading]   = useState(false)
  const [showClear,   setShowClear]   = useState(false)
  const [clearing,    setClearing]    = useState(false)
  const [search,      setSearch]      = useState('')
  const [levelFilter, setLevelFilter] = useState('All')
  const [uploadedAt,  setUploadedAt]  = useState(null)
  const fileRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    getMasterList().then(data => {
      setList(data)
      setFiltered(data)
      if (data[0]?.uploadedAt) setUploadedAt(data[0].uploadedAt)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = list
    if (levelFilter !== 'All') result = result.filter(s => s.level === levelFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) || s.matric?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [search, levelFilter, list])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ab   = await file.arrayBuffer()
      const wb   = XLSX.read(ab)
      const students = wb.SheetNames.flatMap(sheetName => {
        const ws   = wb.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
        return parseExcelStudentList(data)
      })
      if (!students.length) throw new Error('No valid students found in file')
      await uploadMasterList(students)
      const updated = await getMasterList()
      setList(updated)
      setUploadedAt(new Date())
      toast(`${students.length} students uploaded successfully`, 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleClear() {
    setClearing(true)
    try {
      await clearMasterList()
      setList([]); setFiltered([]); setUploadedAt(null)
      toast('Master list cleared', 'success')
    } catch { toast('Failed to clear', 'error') }
    finally { setClearing(false); setShowClear(false) }
  }

  async function handlePrint() {
    let logoDataUrl = ''
    try {
      const { default: logoSrc } = await import('@/assets/gaposa-logo.png')
      const res  = await fetch(logoSrc)
      const blob = await res.blob()
      logoDataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob) })
    } catch { /* skip logo if unavailable */ }

    const printed = new Date().toLocaleString('en-GB', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Master List — EEE FACE-ID</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Arial,sans-serif;font-size:11px;padding:28px 32px;color:#111}
      table{width:100%;border-collapse:collapse;margin-top:18px}
      th{background:#1F6F5F;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
      td{padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:11px}
      tr:nth-child(even) td{background:#f9fafb}
      .meta{margin:12px 0 0;font-size:10px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:10px}
      .foot{margin-top:20px;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px}
      @media print{body{padding:16px 20px}}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:18px;padding-bottom:16px;margin-bottom:18px;border-bottom:3px solid #1F6F5F">
      ${logoDataUrl ? `<img src="${logoDataUrl}" style="width:72px;height:72px;object-fit:contain" alt="Logo"/>` : ''}
      <div>
        <h1 style="margin:0;font-size:19px;font-weight:900;color:#1F6F5F;text-transform:uppercase">GATEWAY ICT POLYTECHNIC</h1>
        <p style="margin:2px 0 0;font-size:10px;color:#6b7280">Saapade, Ogun State, Nigeria</p>
        <p style="margin:5px 0 0;font-size:11px;font-weight:800;color:#1e3a5f">Department of Electrical / Electronics Engineering</p>
        <p style="margin:2px 0 0;font-size:10px;color:#2FA084;font-weight:700">EEE FACE-ID Attendance Management System</p>
      </div>
    </div>
    <h2 style="margin:0;font-size:14px;font-weight:900;color:#1e293b">Master Student List</h2>
    <p class="meta">Total: <strong>${filtered.length} students</strong>${levelFilter !== 'All' ? ` · Level: ${levelFilter}` : ''} · Printed: ${printed}</p>
    <table>
      <thead><tr><th>#</th><th>Matric No.</th><th>Full Name</th><th>Level</th><th>Course</th></tr></thead>
      <tbody>${filtered.map((s,i) => `<tr><td>${i+1}</td><td>${s.matric}</td><td>${s.name}</td><td>${s.level}</td><td>${s.course||'—'}</td></tr>`).join('')}</tbody>
    </table>
    <div class="foot">
      <span>Gateway ICT Polytechnic, Saapade · Electrical/Electronics Engineering Dept.</span>
      <span>EEE FACE-ID Attendance System</span>
    </div>
    <script>window.onload=function(){window.print()}<\/script>
    </body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const w    = window.open(url, '_blank')
    if (!w) {
      const a = document.createElement('a')
      a.href = url; a.download = 'master-list.html'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  const hasFilters = search || levelFilter !== 'All'
  const levelCounts = ['All', ...LEVELS].map(l => ({
    label: l, count: l === 'All' ? list.length : list.filter(s => s.level === l).length
  }))

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div style={{ marginBottom: '0.25rem' }}>
            <AnimatedLabel text="Master List" Icon={BookOpen} />
          </div>
          <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{profile?.name || 'Administrator'}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50">
            {uploading ? <Spinner size={14}/> : <Upload size={15}/>} Upload Master List
          </button>
          <button onClick={handlePrint} disabled={!filtered.length}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold rounded-xl text-sm transition-all disabled:opacity-40">
            <Printer size={15}/> Print List
          </button>
          <button onClick={() => setShowClear(true)} disabled={!list.length}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 bg-white hover:bg-red-50 text-red-600 font-semibold rounded-xl text-sm transition-all disabled:opacity-40">
            <Trash2 size={15}/> Clear All
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile}/>
        </div>
      </div>

      {/* Format guide */}
      <div style={{ background: '#f0fdf4', border: '1.5px solid rgba(47,160,132,0.3)', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.65rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(47,160,132,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={14} color="#2FA084" />
          </div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: '#1F6F5F' }}>Upload Format — Excel or CSV</p>
        </div>
        <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: '#475569', lineHeight: 1.6 }}>
          The file must have <strong>4 columns in this exact order</strong> — no header row required. Accepted formats: <code style={{ background: 'rgba(47,160,132,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: '0.75rem' }}>.xlsx</code> <code style={{ background: 'rgba(47,160,132,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: '0.75rem' }}>.xls</code> <code style={{ background: 'rgba(47,160,132,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: '0.75rem' }}>.csv</code>
        </p>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid rgba(47,160,132,0.2)', overflow: 'hidden', marginBottom: '0.6rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: 'rgba(47,160,132,0.08)' }}>
                {['Column A', 'Column B', 'Column C', 'Column D'].map((h, i) => (
                  <th key={i} style={{ padding: '0.45rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#2FA084', fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderRight: i < 3 ? '1px solid rgba(47,160,132,0.15)' : 'none' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <thead>
              <tr style={{ background: '#f8fafc', borderTop: '1px solid rgba(47,160,132,0.15)' }}>
                {['Matric Number', 'Full Name', 'Level', 'Option / Course'].map((h, i) => (
                  <th key={i} style={{ padding: '0.4rem 0.85rem', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.72rem', borderRight: i < 3 ? '1px solid #f1f5f9' : 'none' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['EEE/HND/24/001', 'ADESANYA JOHN', 'HND 2', 'Electronics / Telecom'],
                ['EEE/HND/24/002', 'IBRAHIM FATIMA', 'HND 2', 'Power / Machines'],
                ['EEE/ND/24/010', 'OKAFOR CHIDI', 'ND 1', 'Electronics / Telecom'],
              ].map((row, ri) => (
                <tr key={ri} style={{ borderTop: '1px solid #f1f5f9' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '0.4rem 0.85rem', color: ri === 0 ? '#1e293b' : '#64748b', fontFamily: ci === 0 ? 'monospace' : 'inherit', fontSize: '0.75rem', borderRight: ci < 3 ? '1px solid #f1f5f9' : 'none' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Valid Level values</p>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['ND 1', 'ND 2', 'HND 1', 'HND 2'].map(l => (
                <code key={l} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{l}</code>
              ))}
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Notes</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5 }}>Column D (Option) is optional. Duplicate matric numbers will be updated, not duplicated.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-blue-600"/>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Records</p>
            <p className="text-2xl font-black text-gray-900">{list.length}</p>
            <p className="text-xs text-gray-400">Students</p>
          </div>
        </div>

        <div className="card">
          <p className="text-xs text-gray-400 font-medium mb-2">Last Uploaded</p>
          {uploadedAt ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Calendar size={13} className="text-brand-500"/> {formatDate(uploadedAt)}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock size={12} className="text-gray-400"/> {formatTime(uploadedAt)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-300 font-medium">Never uploaded</p>
          )}
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Search size={18} className="text-green-600"/>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Showing</p>
            <p className="text-2xl font-black text-gray-900">{filtered.length}</p>
            <p className="text-xs text-gray-400">of {list.length} students</p>
          </div>
        </div>
      </div>

      {/* Level filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {levelCounts.map(({ label, count }) => (
          <button key={label} onClick={() => setLevelFilter(label)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
              ${levelFilter === label
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              levelFilter === label ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="Search by name or matric number…"
            className="input-field pl-9 text-sm" value={search}
            onChange={e => setSearch(e.target.value)}/>
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14}/>
            </button>
          )}
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setLevelFilter('All') }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 whitespace-nowrap">
            <X size={12}/> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={24} color="brand"/></div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['#','Matric No.','Full Name','Level','Course'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={28} className="text-gray-200"/>
                      <p className="text-gray-400 text-sm font-medium">
                        {list.length === 0 ? 'No records. Upload a master list.' : 'No students match your search.'}
                      </p>
                      {hasFilters && (
                        <button onClick={() => { setSearch(''); setLevelFilter('All') }}
                          className="text-xs text-brand-600 font-semibold hover:underline">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td></tr>
                ) : filtered.map((s, i) => (
                  <tr key={s.matric || i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-600">{s.matric}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{s.level}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.course || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of{' '}
                <span className="font-semibold text-gray-600">{list.length}</span> students
                {levelFilter !== 'All' && <span className="ml-1">· Level: <span className="font-semibold">{levelFilter}</span></span>}
              </p>
              {filtered.length > 0 && (
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold hover:underline">
                  <Printer size={12}/> Print this view
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmModal open={showClear} onClose={() => setShowClear(false)} onConfirm={handleClear}
        title="Clear Master List"
        message={`This will permanently delete all ${list.length} student records. This cannot be undone.`}
        confirmLabel="Clear All Records" danger loading={clearing}/>
    </AdminLayout>
  )
}
