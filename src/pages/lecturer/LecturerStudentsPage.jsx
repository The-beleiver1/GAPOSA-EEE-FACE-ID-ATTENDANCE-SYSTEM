import { useState, useEffect } from 'react'
import { GraduationCap } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { LecturerLayout } from '@/components/layout/LecturerLayout'
import { useAuthStore } from '@/store/authStore'
import { getLecturerCourses } from '@/services/courseService'
import { getEnrolledStudents, getStudentsTelegramStatus } from '@/services/studentService'
import { Spinner } from '@/components/ui/Spinner'

export default function LecturerStudentsPage() {
  const { profile } = useAuthStore()
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('All')
  const [tgStatus, setTgStatus] = useState({})

  useEffect(() => {
    Promise.all([getLecturerCourses(profile.id), getEnrolledStudents()])
      .then(([c, s]) => {
        setCourses(c); setStudents(s)
        getStudentsTelegramStatus(s.map(st => st.matric)).then(setTgStatus)
      })
      .finally(() => setLoading(false))
  }, [])

  const levels = [...new Set(courses.map(c => c.level).filter(Boolean))]

  const filtered = students
    .filter(s => levels.length === 0 || levels.includes(s.level))
    .filter(s => selectedLevel === 'All' || s.level === selectedLevel)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.matric.toLowerCase().includes(search.toLowerCase()))

  return (
    <LecturerLayout>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <AnimatedLabel text="Students" Icon={GraduationCap} />
          </div>
          <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{profile?.name || 'Lecturer'}</h1>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
          {[
            { label: 'Total Students', value: filtered.length, color: '#2FA084' },
            { label: 'Course Levels', value: levels.length || '—', color: '#6FCF97' },
            { label: 'Your Courses', value: courses.length, color: '#2FA084' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: '0.85rem 1rem', boxShadow: '0 2px 12px rgba(31,111,95,0.07)', border: '1px solid #f1f5f9' }}>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 800, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(31,111,95,0.07)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '0.65rem', padding: '0.85rem 1rem', borderBottom: '1px solid #f8fafc', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ width: 15, height: 15, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name or matric…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: 9, outline: 'none', fontFamily: 'inherit', color: '#334155', boxSizing: 'border-box' }}
              />
            </div>
            {/* Level filter */}
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              style={{ padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: 9, outline: 'none', fontFamily: 'inherit', color: '#334155', background: '#fff' }}>
              <option value="All">All Levels</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Spinner size={24} color="brand" />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'Name', 'Matric No.', 'Level', 'Option', 'Telegram'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.7rem 1rem', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                      {students.length === 0 ? 'No enrolled students yet' : 'No students match this search'}
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => (
                  <tr key={s.matric} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{i + 1}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(47,160,132,0.08)', border: '1.5px solid rgba(47,160,132,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#2FA084', flexShrink: 0 }}>
                          {s.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        {s.name}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>{s.matric}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ display: 'inline-block', padding: '0.22rem 0.6rem', borderRadius: 6, background: '#eff6ff', color: '#3b82f6', fontSize: '0.72rem', fontWeight: 700 }}>{s.level}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>{s.option || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {tgStatus[s.matric]
                        ? <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2FA084', background: 'rgba(47,160,132,0.1)', border: '1px solid rgba(47,160,132,0.22)', padding: '2px 8px', borderRadius: 99 }}>✓ Linked</span>
                        : <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', padding: '2px 8px', borderRadius: 99 }}>Not Linked</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ padding: '0.65rem 1rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>Showing {filtered.length} students</p>
          </div>
        </div>
      </div>
    </LecturerLayout>
  )
}
