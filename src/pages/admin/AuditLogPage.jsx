import { useState, useEffect } from 'react'
import { ClipboardList, RefreshCw } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getAuditLogs } from '@/services/studentService'
import { Spinner } from '@/components/ui/Spinner'

const ACTION_COLORS = {
  delete:  { bg: '#fee2e2', color: '#991b1b' },
  approve: { bg: '#dcfce7', color: '#166534' },
  reject:  { bg: '#fee2e2', color: '#991b1b' },
  update:  { bg: '#dbeafe', color: '#1e40af' },
  create:  { bg: '#f0fdf4', color: '#15803d' },
  finalise:{ bg: '#ede9fe', color: '#6d28d9' },
  default: { bg: '#f1f5f9', color: '#64748b' },
}

function actionStyle(action = '') {
  const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k)) || 'default'
  return ACTION_COLORS[key]
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AuditLogPage() {
  const [logs,     setLogs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('')
  const [expanded, setExpanded] = useState(null)

  async function load() {
    setLoading(true)
    const data = await getAuditLogs(200)
    setLogs(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = logs.filter(l =>
    !filter ||
    l.action?.toLowerCase().includes(filter.toLowerCase()) ||
    l.user_name?.toLowerCase().includes(filter.toLowerCase()) ||
    l.target_type?.toLowerCase().includes(filter.toLowerCase()) ||
    l.target_id?.toLowerCase().includes(filter.toLowerCase())
  )

  const CARD = { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }

  return (
    <AdminLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.65rem' }}>
          <div>
            <div style={{ marginBottom: '0.25rem' }}><AnimatedLabel text="Audit Log" Icon={ClipboardList} /></div>
            <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 }}>System Audit Log</h1>
          </div>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Filter */}
        <div style={{ marginBottom: '1rem' }}>
          <input type="text" placeholder="Filter by action, user, or target…"
            value={filter} onChange={e => setFilter(e.target.value)}
            style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b', background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>

        <div style={{ ...CARD, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={28} color="brand" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
              <ClipboardList size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>No audit entries yet</p>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem' }}>Actions logged here once admin activity occurs</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Time', 'User', 'Action', 'Target', 'Details'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.7rem 1rem', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const ac = actionStyle(l.action)
                  const isOpen = expanded === l.id
                  return (
                    <tr key={l.id} onClick={() => setExpanded(isOpen ? null : l.id)}
                      style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', background: isOpen ? '#fafeff' : 'transparent' }}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#f9fafb' }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}>
                      <td style={{ padding: '0.7rem 1rem', fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{timeAgo(l.created_at)}</td>
                      <td style={{ padding: '0.7rem 1rem' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{l.user_name || '—'}</p>
                          <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8' }}>{l.user_role}</p>
                        </div>
                      </td>
                      <td style={{ padding: '0.7rem 1rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: ac.bg, color: ac.color }}>{l.action}</span>
                      </td>
                      <td style={{ padding: '0.7rem 1rem' }}>
                        {l.target_type && <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{l.target_type}</p>}
                        {l.target_id && <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace' }}>{l.target_id.slice(0, 30)}{l.target_id.length > 30 ? '…' : ''}</p>}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', fontSize: '0.72rem', color: '#64748b' }}>
                        {isOpen && l.details ? (
                          <pre style={{ margin: 0, fontSize: '0.65rem', background: '#f8fafc', padding: '0.5rem', borderRadius: 6, maxWidth: 220, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(l.details, null, 2)}
                          </pre>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>{l.details ? 'Click to expand' : '—'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: '0.65rem 1rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>Showing {filtered.length} of {logs.length} entries · Click a row to expand details</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
