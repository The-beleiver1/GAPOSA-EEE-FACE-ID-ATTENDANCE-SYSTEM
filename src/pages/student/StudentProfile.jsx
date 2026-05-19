import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'

const initials = name => (name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

const CARD = {
  background: '#fff',
  border: '1px solid #f1f5f9',
  borderRadius: 18,
  boxShadow: '0 2px 12px rgba(31,111,95,0.07)',
  padding: '1.25rem 1.5rem',
}

export default function StudentProfile() {
  const matric   = sessionStorage.getItem('studentMatric') || ''
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!matric) return
    supabase
      .from('students')
      .select('matric,name,level,option,enrolled')
      .ilike('matric', matric)
      .single()
      .then(({ data }) => { setStudent(data); setLoading(false) })
  }, [matric])

  if (loading) return (
    <StudentLayout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner size={28} color="brand" />
      </div>
    </StudentLayout>
  )

  const rows = [
    { label: 'Full Name',     value: student?.name   || '—' },
    { label: 'Matric Number', value: student?.matric || matric || '—' },
    { label: 'Department',    value: 'Electrical / Electronics Engineering' },
    { label: 'Option',        value: student?.option || '—' },
    { label: 'Level',         value: student?.level  ? `${student.level} Level` : '—' },
    { label: 'Status',        badge: true },
  ]

  return (
    <StudentLayout>
      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.25rem' }}>
          <AnimatedLabel text="Profile" Icon={User} />
        </div>
        <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 }}>
          {student?.name || 'Student Profile'}
        </h1>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ── Identity card ── */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg,#1F6F5F,#2FA084)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.15rem', fontWeight: 900, color: '#fff',
              flexShrink: 0, letterSpacing: '0.04em',
              boxShadow: '0 3px 14px rgba(31,111,95,0.3)',
            }}>
              {initials(student?.name)}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.25 }}>
                {student?.name || '—'}
              </p>
              <p style={{ margin: '0.18rem 0 0', fontSize: '0.73rem', color: '#2FA084', fontWeight: 600 }}>
                Student · EEE Department
              </p>
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{
                  fontSize: '0.63rem', fontWeight: 800,
                  color: '#059669',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.22)',
                  borderRadius: 99, padding: '3px 10px',
                  letterSpacing: '0.05em',
                }}>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Account Details card ── */}
        <div style={CARD}>
          <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
            Account Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map(({ label, value, badge }, i) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.7rem 0',
                borderBottom: i < rows.length - 1 ? '1px solid #f8fafc' : 'none',
                gap: '1.5rem',
              }}>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>
                  {label}
                </span>

                {badge ? (
                  <span style={{
                    fontSize: '0.63rem', fontWeight: 800,
                    color: '#059669',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.22)',
                    borderRadius: 99, padding: '3px 12px',
                    letterSpacing: '0.05em',
                  }}>
                    Enrolled
                  </span>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 700, textAlign: 'right' }}>
                    {value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </StudentLayout>
  )
}
