import { useState, useEffect, useCallback } from 'react'
import { User, Send, CheckCircle, XCircle, Copy, Check } from 'lucide-react'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { generateTelegramLinkCode, getTelegramLinked, unlinkTelegram } from '@/services/studentService'

const initials = name => (name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

const CARD = {
  background:   '#fff',
  border:       '1px solid #f1f5f9',
  borderRadius: 18,
  boxShadow:    '0 2px 12px rgba(31,111,95,0.07)',
  padding:      '1.25rem 1.5rem',
}

export default function StudentProfile() {
  const matric = sessionStorage.getItem('studentMatric') || ''

  const [student,       setStudent]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [telegramLinked, setTelegramLinked] = useState(false)

  // Link flow state
  const [linkCode,       setLinkCode]       = useState(null)
  const [linkLoading,    setLinkLoading]    = useState(false)
  const [copied,         setCopied]         = useState(false)
  const [checkLoading,   setCheckLoading]   = useState(false)
  const [unlinkLoading,  setUnlinkLoading]  = useState(false)

  const loadStudent = useCallback(async () => {
    if (!matric) return
    const { data } = await supabase
      .from('students')
      .select('matric,name,level,option,enrolled,email,email_verified,telegram_chat_id')
      .ilike('matric', matric)
      .single()
    setStudent(data)
    setTelegramLinked(!!data?.telegram_chat_id)
    setLoading(false)
  }, [matric])

  useEffect(() => { loadStudent() }, [loadStudent])

  async function handleGenerateCode() {
    setLinkLoading(true)
    try {
      const code = await generateTelegramLinkCode(matric)
      setLinkCode(code)
    } catch { /* silent */ }
    finally { setLinkLoading(false) }
  }

  async function handleCopy() {
    if (!linkCode) return
    await navigator.clipboard.writeText(linkCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCheckStatus() {
    setCheckLoading(true)
    const linked = await getTelegramLinked(matric)
    setTelegramLinked(linked)
    if (linked) setLinkCode(null)
    setCheckLoading(false)
  }

  async function handleUnlink() {
    setUnlinkLoading(true)
    try { await unlinkTelegram(matric) } catch { /* silent */ }
    setTelegramLinked(false)
    setUnlinkLoading(false)
  }

  if (loading) return (
    <StudentLayout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner size={28} color="brand" />
      </div>
    </StudentLayout>
  )

  const rows = [
    { label: 'Full Name',     value: student?.name   || '—' },
    { label: 'Matric Number', value: student?.matric  || matric || '—' },
    { label: 'Department',    value: 'Electrical / Electronics Engineering' },
    { label: 'Option',        value: student?.option  || '—' },
    { label: 'Level',         value: student?.level   ? `${student.level} Level` : '—' },
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.25 }}>
                {student?.name || '—'}
              </p>
              <p style={{ margin: '0.18rem 0 0', fontSize: '0.73rem', color: '#2FA084', fontWeight: 600 }}>
                Student · EEE Department
              </p>
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{
                  fontSize: '0.63rem', fontWeight: 800, color: '#059669',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)',
                  borderRadius: 99, padding: '3px 10px', letterSpacing: '0.05em',
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
                    fontSize: '0.63rem', fontWeight: 800, color: '#059669',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)',
                    borderRadius: 99, padding: '3px 12px', letterSpacing: '0.05em',
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

        {/* ── Notifications card ── */}
        <div style={CARD}>
          <h3 style={{ margin: '0 0 0.9rem', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
            Notifications
          </h3>

          {/* Email row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.7rem 0', borderBottom: '1px solid #f8fafc', gap: '1.5rem',
          }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>Email</span>
            <span style={{
              fontSize: '0.63rem', fontWeight: 800,
              color:      student?.email_verified ? '#059669' : '#d97706',
              background: student?.email_verified ? 'rgba(16,185,129,0.1)' : 'rgba(217,119,6,0.1)',
              border:     `1px solid ${student?.email_verified ? 'rgba(16,185,129,0.22)' : 'rgba(217,119,6,0.22)'}`,
              borderRadius: 99, padding: '3px 12px', letterSpacing: '0.05em',
            }}>
              {student?.email_verified ? 'Verified' : 'Not verified'}
            </span>
          </div>

          {/* Telegram row */}
          <div style={{ padding: '0.9rem 0 0.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={14} color="#94a3b8" strokeWidth={2} />
                <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>Telegram</span>
              </div>

              {telegramLinked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle size={13} color="#059669" strokeWidth={2.5} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>Connected</span>
                  </div>
                  <button
                    onClick={handleUnlink}
                    disabled={unlinkLoading}
                    style={{
                      background: 'none', border: '1px solid #fecaca', borderRadius: 8,
                      padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700,
                      color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit',
                      opacity: unlinkLoading ? 0.5 : 1,
                    }}
                  >
                    {unlinkLoading ? '…' : 'Unlink'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateCode}
                  disabled={linkLoading || !!linkCode}
                  style={{
                    background: linkCode ? '#f8fafc' : 'linear-gradient(135deg,#2FA084,#1F6F5F)',
                    border: linkCode ? '1px solid #e2e8f0' : 'none',
                    borderRadius: 10, padding: '6px 14px',
                    fontSize: '0.72rem', fontWeight: 700,
                    color: linkCode ? '#94a3b8' : '#fff',
                    cursor: linkCode ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: linkLoading ? 0.6 : 1,
                  }}
                >
                  {linkLoading ? 'Generating…' : linkCode ? 'Code generated' : 'Link Telegram'}
                </button>
              )}
            </div>

            {/* Link code instructions */}
            {!telegramLinked && linkCode && (
              <div style={{
                marginTop: '1rem',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 14, padding: '1.1rem 1.2rem',
              }}>
                <p style={{ margin: '0 0 0.8rem', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                  Steps to connect:
                </p>
                <ol style={{ margin: '0 0 1rem', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {[
                    'Open Telegram on your phone',
                    'Search for @gaposa_eee_bot and tap Start',
                    'Send the code below to the bot',
                  ].map((step, i) => (
                    <li key={i} style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>{step}</li>
                  ))}
                </ol>

                {/* Code display */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fff', border: '1.5px solid #2FA084',
                  borderRadius: 10, padding: '0.65rem 1rem',
                }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: '1.05rem',
                    fontWeight: 900, color: '#1F6F5F', letterSpacing: '0.12em',
                  }}>
                    {linkCode}
                  </span>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}
                    title="Copy code"
                  >
                    {copied
                      ? <Check size={15} color="#059669" strokeWidth={2.5} />
                      : <Copy size={15} color="#2FA084" strokeWidth={2} />
                    }
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: copied ? '#059669' : '#2FA084' }}>
                      {copied ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>

                <p style={{ margin: '0.6rem 0 0.9rem', fontSize: '0.68rem', color: '#94a3b8' }}>
                  Code expires in 15 minutes.
                </p>

                <button
                  onClick={handleCheckStatus}
                  disabled={checkLoading}
                  style={{
                    width: '100%', background: 'linear-gradient(135deg,#2FA084,#1F6F5F)',
                    border: 'none', borderRadius: 10, padding: '9px',
                    fontSize: '0.78rem', fontWeight: 700, color: '#fff',
                    cursor: checkLoading ? 'default' : 'pointer',
                    fontFamily: 'inherit', opacity: checkLoading ? 0.6 : 1,
                  }}
                >
                  {checkLoading ? 'Checking…' : 'Done — Check Status'}
                </button>
              </div>
            )}

            {/* Not linked description */}
            {!telegramLinked && !linkCode && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.55 }}>
                Link your Telegram account to receive instant attendance notifications.
              </p>
            )}
          </div>
        </div>

      </div>
    </StudentLayout>
  )
}
