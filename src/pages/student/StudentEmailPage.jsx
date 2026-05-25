import { useState, useEffect, useRef } from 'react'
import { Mail } from 'lucide-react'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { Spinner } from '@/components/ui/Spinner'
import { getStudentEmail, saveAndSendOTP, verifyEmailOTP, removeStudentEmail } from '@/services/studentService'
import { sendStudentOTP, studentEmailConfigured } from '@/services/emailService'

export default function StudentEmailPage() {
  const matric = sessionStorage.getItem('studentMatric') || ''
  const name   = sessionStorage.getItem('studentName')   || 'Student'

  const [step,       setStep]       = useState('loading')
  const [emailInput, setEmailInput] = useState('')
  const [otpInput,   setOtpInput]   = useState('')
  const [savedEmail, setSavedEmail] = useState('')
  const [error,      setError]      = useState('')
  const [countdown,  setCountdown]  = useState(0)
  const cdRef = useRef(null)

  useEffect(() => {
    getStudentEmail(matric).then(({ email, email_verified }) => {
      if (email && email_verified) { setSavedEmail(email); setStep('verified') }
      else setStep('idle')
    })
  }, [matric])

  function startCountdown(secs = 60) {
    setCountdown(secs)
    clearInterval(cdRef.current)
    cdRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(cdRef.current); return 0 } return c - 1 })
    }, 1000)
  }

  async function handleSendCode(e) {
    e.preventDefault()
    if (!emailInput.trim()) return
    setError(''); setStep('sending')
    try {
      const otp = await saveAndSendOTP(matric, emailInput.trim())
      await sendStudentOTP(emailInput.trim(), name, otp)
      setStep('otp_sent'); startCountdown(60)
    } catch (err) { console.error('[StudentEmail] sendCode failed:', err); setError(err?.message || 'Failed to send code. Check the email address and try again.'); setStep('idle') }
  }

  async function handleVerify(e) {
    e.preventDefault()
    if (otpInput.length !== 6) return
    setError(''); setStep('verifying')
    try {
      const ok = await verifyEmailOTP(matric, emailInput.trim(), otpInput.trim())
      if (ok) { setSavedEmail(emailInput.trim()); setStep('verified') }
      else { setError('Incorrect or expired code. Try again.'); setStep('otp_sent') }
    } catch { setError('Verification failed. Try again.'); setStep('otp_sent') }
  }

  async function handleRemove() {
    setStep('removing')
    try { await removeStudentEmail(matric); setSavedEmail(''); setEmailInput(''); setStep('idle') }
    catch { setStep('verified') }
  }

  const emailsReady = studentEmailConfigured()
  const isVerified  = step === 'verified'

  return (
    <StudentLayout>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.25rem' }}>
          <AnimatedLabel text="Email Notifications" Icon={Mail} />
        </div>
        <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 }}>
          {isVerified ? 'Notifications Active' : 'Set Up Email Alerts'}
        </h1>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}>
          <div style={{ height: 4, background: isVerified ? 'linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97)' : 'linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)' }} />
          <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: isVerified ? 'rgba(47,160,132,0.1)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={isVerified ? '#2FA084' : '#6366f1'} strokeWidth="1.8" style={{ width: 18, height: 18 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>Email Notifications</p>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.3 }}>
                  {isVerified ? "You'll receive alerts after each class is finalised" : 'Get notified when your attendance is recorded'}
                </p>
              </div>
              {isVerified && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(47,160,132,0.08)', border: '1px solid rgba(47,160,132,0.2)', borderRadius: 99, padding: '0.2rem 0.65rem' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2FA084' }} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#2FA084', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active</span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 8, padding: '0.45rem 0.7rem' }}>{error}</p>}

            {/* Not configured */}
            {!emailsReady && step !== 'loading' && (
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', padding: '0.5rem 0' }}>Email service not configured — contact admin.</p>
            )}

            {step === 'loading' && <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem' }}><Spinner size={22} color="brand" /></div>}

            {step === 'idle' && emailsReady && (
              <form onSubmit={handleSendCode} style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} required
                  placeholder="your.email@example.com"
                  style={{ flex: 1, padding: '0.68rem 0.9rem', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.82rem', color: '#1e293b', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', minWidth: 0 }} />
                <button type="submit"
                  style={{ padding: '0.68rem 1.1rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}>
                  Send Code
                </button>
              </form>
            )}

            {step === 'sending' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0' }}>
                <Spinner size={16} color="brand" />
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Sending verification code…</span>
              </div>
            )}

            {step === 'otp_sent' && emailsReady && (
              <form onSubmit={handleVerify}>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', color: '#64748b' }}>
                  6-digit code sent to <strong style={{ color: '#1e293b' }}>{emailInput}</strong>
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.55rem' }}>
                  <input type="text" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g,'').slice(0,6))} required
                    placeholder="000000" maxLength={6}
                    style={{ flex: 1, padding: '0.68rem 0.9rem', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.18em', textAlign: 'center', color: '#1e293b', outline: 'none', fontFamily: 'monospace', background: '#f8fafc', minWidth: 0 }} />
                  <button type="submit" disabled={otpInput.length !== 6}
                    style={{ padding: '0.68rem 1.1rem', borderRadius: 10, border: 'none', background: otpInput.length === 6 ? 'linear-gradient(135deg,#2FA084,#1F6F5F)' : '#e2e8f0', color: otpInput.length === 6 ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.8rem', cursor: otpInput.length === 6 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    Verify
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => { setStep('idle'); setOtpInput(''); setError('') }}
                    style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>
                    ← Change email
                  </button>
                  {countdown > 0
                    ? <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Resend in {countdown}s</span>
                    : <button type="button" onClick={handleSendCode}
                        style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: '#6366f1', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                        Resend code
                      </button>
                  }
                </div>
              </form>
            )}

            {step === 'verifying' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0' }}>
                <Spinner size={16} color="brand" />
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Verifying code…</span>
              </div>
            )}

            {step === 'verified' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2FA084" strokeWidth="2.2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{savedEmail}</span>
                <button onClick={handleRemove} disabled={step === 'removing'}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 7, padding: '0.3rem 0.7rem', fontSize: '0.68rem', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, flexShrink: 0 }}>
                  Remove
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
