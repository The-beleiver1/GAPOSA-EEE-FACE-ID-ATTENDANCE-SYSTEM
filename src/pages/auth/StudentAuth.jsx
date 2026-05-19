import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { hasStudentPin, verifyStudentPin, saveStudentPin, getStudentEmail, saveAndSendOTP, verifyEmailOTP } from '@/services/studentService'
import { sendStudentOTP } from '@/services/emailService'
import logo from '../../assets/gaposa-logo.png'
import img1 from '@/assets/electric-pole-foggy-day.jpg'
import img2 from '@/assets/warm-filament-bulbs-cast-cozy-amber-glow-dimly-lit-room.jpg'
import img3 from '@/assets/sun-setting-silhouette-electricity-pylons.jpg'

const SLIDES = [img1, img2, img3]

export default function StudentAuth() {
  const [matric,       setMatric]       = useState('')
  const [enrollMatric, setEnrollMatric] = useState('')
  const [tab,          setTab]          = useState('login')
  const [animKey,      setAnimKey]      = useState(0)
  const [slideDir,     setSlideDir]     = useState('right')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [active,       setActive]       = useState(0)

  // PIN step state
  const [pinStep,     setPinStep]     = useState(false)
  const [studentData, setStudentData] = useState(null)
  const [pin,         setPin]         = useState('')

  // Forgot PIN flow
  const [fpFlow,       setFpFlow]       = useState(false)
  const [fpStep,       setFpStep]       = useState('check')
  const [fpEmail,      setFpEmail]      = useState('')
  const [fpOtp,        setFpOtp]        = useState('')
  const [fpNewPin,     setFpNewPin]     = useState('')
  const [fpConfirmPin, setFpConfirmPin] = useState('')
  const [fpError,      setFpError]      = useState('')
  const [fpCountdown,  setFpCountdown]  = useState(0)
  const fpCdRef = useRef(null)

  const navigate = useNavigate()
  const initials = n => (n || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  // Issue a real Supabase anonymous session so RLS can scope student queries
  async function completeStudentLogin(student) {
    await supabase.auth.signOut()                         // clear any stale session
    await supabase.auth.signInAnonymously()               // create anonymous session
    await supabase.auth.updateUser({ data: { matric: student.matric, name: student.name } }) // bind to JWT
    sessionStorage.setItem('studentMatric', student.matric)
    sessionStorage.setItem('studentName',   student.name)
    navigate('/student/attendance', { state: { matric: student.matric, student } })
  }

  useEffect(() => {
    const iv = setInterval(() => setActive(s => (s + 1) % SLIDES.length), 4500)
    return () => clearInterval(iv)
  }, [])

  function switchTab(newTab) {
    if (newTab === tab) return
    setSlideDir(newTab === 'enroll' ? 'right' : 'left')
    setError('')
    setTab(newTab)
    setAnimKey(k => k + 1)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data, error: dbError } = await supabase
        .from('students')
        .select('matric, name, level, option, enrolled')
        .ilike('matric', matric.trim())
        .maybeSingle()

      if (dbError) throw new Error(dbError.message)
      if (!data) { setError('Matric number not found. Please enroll your face first.'); return }
      if (!data.enrolled) { setError('Face not enrolled yet. Please complete face enrollment first.'); return }

      const hasPIN = await hasStudentPin(data.matric)
      if (hasPIN) {
        setStudentData(data)
        setPinStep(true)
        return
      }

      await completeStudentLogin(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePinVerify(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const ok = await verifyStudentPin(studentData.matric, pin)
      if (!ok) { setError('Incorrect PIN. Please try again.'); return }
      await completeStudentLogin(studentData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function startFpCountdown(secs = 60) {
    setFpCountdown(secs)
    clearInterval(fpCdRef.current)
    fpCdRef.current = setInterval(() => {
      setFpCountdown(c => { if (c <= 1) { clearInterval(fpCdRef.current); return 0 } return c - 1 })
    }, 1000)
  }

  async function handleForgotPin() {
    setFpError(''); setFpStep('sending')
    try {
      const { email, email_verified } = await getStudentEmail(studentData.matric)
      if (!email || !email_verified) {
        setFpError('No verified email on file. Contact admin to reset your PIN.')
        setFpStep('check'); return
      }
      setFpEmail(email)
      const otp = await saveAndSendOTP(studentData.matric, email)
      await sendStudentOTP(email, studentData.name, otp)
      setFpStep('sent'); startFpCountdown(60)
    } catch { setFpError('Failed to send reset code. Try again.'); setFpStep('check') }
  }

  async function handleFpVerify(e) {
    e.preventDefault()
    setFpError(''); setFpStep('verifying')
    try {
      const ok = await verifyEmailOTP(studentData.matric, fpEmail, fpOtp)
      if (!ok) { setFpError('Incorrect or expired code. Try again.'); setFpStep('sent'); return }
      setFpStep('new_pin')
    } catch { setFpError('Verification failed. Try again.'); setFpStep('sent') }
  }

  async function handleFpNewPin(e) {
    e.preventDefault()
    setFpError('')
    if (!/^\d{4}$/.test(fpNewPin))    { setFpError('PIN must be exactly 4 digits'); return }
    if (fpNewPin !== fpConfirmPin)     { setFpError('PINs do not match'); return }
    setFpStep('saving')
    try {
      await saveStudentPin(studentData.matric, fpNewPin)
      await completeStudentLogin(studentData)
    } catch (err) { setFpError('Failed to save PIN: ' + err.message); setFpStep('new_pin') }
  }

  function resetFpFlow() {
    setFpFlow(false); setFpStep('check'); setFpError('')
    setFpOtp(''); setFpNewPin(''); setFpConfirmPin(''); setFpEmail('')
    clearInterval(fpCdRef.current); setFpCountdown(0)
  }

  async function handleEnrollCheck(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data: masterData, error: masterError } = await supabase
        .from('master_list')
        .select('matric, name, level, option')
        .ilike('matric', enrollMatric.trim())
        .maybeSingle()

      if (masterError) throw new Error(masterError.message)
      if (!masterData) { setError('Matric number not found in master list. Contact admin if this is wrong.'); return }

      const { data: studentData } = await supabase
        .from('students')
        .select('matric, enrolled')
        .ilike('matric', enrollMatric.trim())
        .maybeSingle()

      if (studentData?.enrolled) {
        setError(`${masterData.name} is already enrolled. Contact admin to reset enrollment if needed.`)
        return
      }

      navigate('/auth/enroll-verify', { state: { student: masterData } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: "'Albert Sans',sans-serif", overflow: 'hidden' }}>

      {/* Background slides */}
      {SLIDES.map((src, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === active ? 1 : 0, zIndex: i === active ? 1 : 0, transition: 'opacity 1.2s ease' }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(135deg, rgba(31,111,95,0.82) 0%, rgba(47,160,132,0.65) 50%, rgba(31,111,95,0.88) 100%)' }} />

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ width: '90vw', maxWidth: '480px', borderRadius: '24px', background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 12px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)', overflow: 'hidden' }}>

          {/* Accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97,#2FA084,#1F6F5F)' }} />

          {/* Header */}
          <div style={{ padding: '1.35rem 1.6rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fff', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7, overflow: 'hidden', flexShrink: 0, boxShadow: '0 6px 20px rgba(0,0,0,0.3)' }}>
              <img src={logo} alt="GAPOSA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 900, color: '#fff', fontSize: '1.05rem', letterSpacing: '0.04em', lineHeight: 1.15 }}>EEE FACE-ID</p>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.63rem', color: 'rgba(255,255,255,0.68)', fontWeight: 500, lineHeight: 1.3 }}>Face Recognition Attendance System</p>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.68rem', color: '#6FCF97', fontWeight: 700, letterSpacing: '0.01em' }}>Gateway ICT Polytechnic</p>
              <p style={{ margin: '0.04rem 0 0', fontSize: '0.6rem', color: 'rgba(255,255,255,0.78)', fontWeight: 500, lineHeight: 1.3 }}>Electrical/Electronics Engineering Dept.</p>
            </div>
          </div>

          <div style={{ padding: '1.1rem 1.6rem 1.5rem' }}>

            {/* Tab switcher */}
            {!pinStep && <div style={{ position: 'relative', display: 'flex', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 16, padding: 4, marginBottom: '1.4rem', border: '1px solid rgba(255,255,255,0.10)' }}>
              {/* Sliding pill */}
              <div style={{
                position: 'absolute', top: 4, bottom: 4,
                width: 'calc(50% - 4px)',
                left: tab === 'login' ? '4px' : 'calc(50%)',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.97)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                transition: 'left 0.38s cubic-bezier(0.34,1.15,0.64,1)',
              }} />
              {[['login', 'Login'], ['enroll', 'New? Enroll']].map(([t, label]) => (
                <button key={t} onClick={() => switchTab(t)}
                  style={{ flex: 1, padding: '0.68rem 0.5rem', border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.87rem', cursor: 'pointer', position: 'relative', zIndex: 1, color: tab === t ? '#111827' : 'rgba(255,255,255,0.78)', transition: 'color 0.28s ease', fontFamily: "'Albert Sans',sans-serif", letterSpacing: '0.02em' }}>
                  {label}
                </button>
              ))}
            </div>}

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(185,28,28,0.72)', border: '1px solid rgba(252,165,165,0.35)', borderRadius: 12, padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', backdropFilter: 'blur(8px)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} style={{ width: 16, height: 16, flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#fff', fontWeight: 600, lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            {/* PIN entry step */}
            {tab === 'login' && pinStep && !fpFlow && (
              <div>
                {/* Student identity card — high contrast white card */}
                <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 18, padding: '1rem 1.2rem', marginBottom: '1.3rem', boxShadow: '0 4px 24px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  {/* Avatar */}
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#1F6F5F,#2FA084)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', fontWeight: 900, color: '#fff', flexShrink: 0, boxShadow: '0 3px 14px rgba(31,111,95,0.45)', letterSpacing: '0.04em' }}>
                    {initials(studentData?.name)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: '#0f3a30', fontSize: '1rem', fontWeight: 900, letterSpacing: '0.01em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{studentData?.name}</p>
                    <p style={{ margin: '0.15rem 0 0', color: '#2FA084', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'monospace' }}>{studentData?.matric}</p>
                    {(studentData?.level || studentData?.option) && (
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        {studentData?.level && <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#fff', background: '#1F6F5F', borderRadius: 99, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{studentData.level}</span>}
                        {studentData?.option && <span style={{ fontSize: '0.56rem', fontWeight: 600, color: '#2FA084', background: 'rgba(47,160,132,0.1)', border: '1px solid rgba(47,160,132,0.25)', borderRadius: 99, padding: '2px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{studentData.option}</span>}
                      </div>
                    )}
                  </div>
                  {/* Online dot */}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6FCF97', boxShadow: '0 0 10px rgba(111,207,151,1)', flexShrink: 0 }} />
                </div>

                <form onSubmit={handlePinVerify}>
                  <p style={{ margin: '0 0 0.55rem', color: 'rgba(255,255,255,0.9)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center' }}>
                    Enter Your PIN
                  </p>
                  <input
                    type="password" inputMode="numeric" maxLength={4}
                    value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
                    required autoFocus placeholder="••••"
                    style={{ width: '100%', padding: '0.95rem 1rem', borderRadius: 14, background: 'rgba(0,0,0,0.18)', border: '2px solid rgba(111,207,151,0.5)', color: '#fff', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '0.65em', textAlign: 'center', marginBottom: '1rem', boxSizing: 'border-box', outline: 'none', fontFamily: "'Albert Sans',sans-serif", transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.15)' }}
                    onFocus={e => e.target.style.borderColor = '#6FCF97'}
                    onBlur={e => e.target.style.borderColor = 'rgba(111,207,151,0.5)'}
                  />
                  <div style={{ display: 'flex', gap: '0.55rem' }}>
                    <button type="button" onClick={() => { setPinStep(false); setPin(''); setError('') }}
                      style={{ flexShrink: 0, padding: '0.88rem 1.2rem', borderRadius: 13, border: '2px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: "'Albert Sans',sans-serif", display: 'flex', alignItems: 'center', gap: '0.4rem', backdropFilter: 'blur(4px)', transition: 'all 0.18s' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                      Back
                    </button>
                    <button type="submit" disabled={loading}
                      style={{ flex: 1, padding: '0.88rem', borderRadius: 13, border: 'none', background: loading ? 'rgba(31,111,95,0.45)' : 'linear-gradient(135deg,#2FA084,#1F6F5F)', color: '#fff', fontWeight: 900, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Albert Sans',sans-serif", letterSpacing: '0.05em', boxShadow: loading ? 'none' : '0 4px 22px rgba(31,111,95,0.65)', transition: 'all 0.2s ease' }}>
                      {loading ? 'Verifying…' : 'Confirm PIN'}
                    </button>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '0.6rem' }}>
                    <button type="button" onClick={() => { setFpFlow(true); setFpStep('check'); setFpError('') }}
                      style={{ background: 'none', border: 'none', color: '#6FCF97', fontSize: '0.74rem', cursor: 'pointer', fontFamily: "'Albert Sans',sans-serif", fontWeight: 700, letterSpacing: '0.02em', textShadow: '0 0 12px rgba(111,207,151,0.7)' }}>
                      Forgot PIN?
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Forgot PIN flow */}
            {tab === 'login' && pinStep && fpFlow && (
              <div>
                {/* Student compact header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.97)', borderRadius: 14, boxShadow: '0 3px 16px rgba(0,0,0,0.18)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1F6F5F,#2FA084)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, color: '#fff', flexShrink: 0, boxShadow: '0 2px 10px rgba(31,111,95,0.4)' }}>
                    {initials(studentData?.name)}
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#0f3a30', fontSize: '0.88rem', fontWeight: 800, lineHeight: 1.2 }}>{studentData?.name}</p>
                    <p style={{ margin: 0, color: '#2FA084', fontSize: '0.65rem', letterSpacing: '0.09em', fontFamily: 'monospace', fontWeight: 700 }}>{studentData?.matric}</p>
                  </div>
                </div>

                <p style={{ margin: '0 0 1rem', color: 'rgba(255,255,255,0.62)', fontSize: '0.76rem', textAlign: 'center', lineHeight: 1.55 }}>
                  {(fpStep === 'check' || fpStep === 'sending') && 'A 6-digit reset code will be sent to your registered email.'}
                  {fpStep === 'sent'      && <span>Code sent to <strong style={{ color: '#fff' }}>{fpEmail}</strong></span>}
                  {fpStep === 'verifying' && 'Verifying code…'}
                  {fpStep === 'new_pin'   && 'Verified! Set your new 4-digit PIN below.'}
                  {fpStep === 'saving'    && 'Saving new PIN…'}
                </p>

                {fpError && (
                  <div style={{ background: 'rgba(185,28,28,0.55)', borderRadius: 10, padding: '0.58rem 0.85rem', marginBottom: '0.85rem', border: '1px solid rgba(252,165,165,0.22)' }}>
                    <p style={{ margin: 0, fontSize: '0.73rem', color: '#fff', fontWeight: 600 }}>{fpError}</p>
                  </div>
                )}

                {(fpStep === 'check' || fpStep === 'sending') && (
                  <button onClick={handleForgotPin} disabled={fpStep === 'sending'}
                    style={{ width: '100%', padding: '0.9rem', borderRadius: 13, border: 'none', background: fpStep === 'sending' ? 'rgba(99,102,241,0.35)' : 'linear-gradient(135deg,#818cf8,#6366f1)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: fpStep === 'sending' ? 'not-allowed' : 'pointer', fontFamily: "'Albert Sans',sans-serif", marginBottom: '0.5rem', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
                    {fpStep === 'sending' ? 'Sending…' : 'Send Reset Code'}
                  </button>
                )}

                {(fpStep === 'sent' || fpStep === 'verifying') && (
                  <form onSubmit={handleFpVerify}>
                    <input type="text" maxLength={6} value={fpOtp} autoFocus
                      onChange={e => { setFpOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setFpError('') }}
                      placeholder="000000"
                      style={{ width: '100%', padding: '0.88rem 1rem', borderRadius: 13, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.38em', textAlign: 'center', marginBottom: '0.7rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }} />
                    <button type="submit" disabled={fpOtp.length !== 6 || fpStep === 'verifying'}
                      style={{ width: '100%', padding: '0.88rem', borderRadius: 13, border: 'none', background: fpOtp.length === 6 && fpStep !== 'verifying' ? 'linear-gradient(135deg,#2FA084,#1F6F5F)' : 'rgba(47,160,132,0.3)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: fpOtp.length === 6 && fpStep !== 'verifying' ? 'pointer' : 'not-allowed', fontFamily: "'Albert Sans',sans-serif", marginBottom: '0.45rem', boxShadow: '0 4px 18px rgba(47,160,132,0.28)' }}>
                      {fpStep === 'verifying' ? 'Verifying…' : 'Verify Code'}
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      {fpCountdown > 0
                        ? <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>Resend in {fpCountdown}s</span>
                        : <button type="button" onClick={handleForgotPin} style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: 'rgba(255,255,255,0.48)', cursor: 'pointer', fontFamily: "'Albert Sans',sans-serif" }}>Resend code</button>
                      }
                    </div>
                  </form>
                )}

                {(fpStep === 'new_pin' || fpStep === 'saving') && (
                  <form onSubmit={handleFpNewPin}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '0.75rem' }}>
                      <div>
                        <p style={{ margin: '0 0 0.3rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>New PIN</p>
                        <input type="password" inputMode="numeric" maxLength={4} value={fpNewPin} autoFocus
                          onChange={e => { setFpNewPin(e.target.value.replace(/\D/g,'').slice(0,4)); setFpError('') }}
                          placeholder="••••"
                          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(0,0,0,0.18)', border: '2px solid rgba(111,207,151,0.4)', color: '#fff', fontSize: '1.1rem', letterSpacing: '0.45em', textAlign: 'center', boxSizing: 'border-box', outline: 'none', fontFamily: "'Albert Sans',sans-serif", transition: 'border-color 0.2s' }}
                          onFocus={e => e.target.style.borderColor = '#6FCF97'}
                          onBlur={e => e.target.style.borderColor = 'rgba(111,207,151,0.4)'} />
                      </div>
                      <div>
                        <p style={{ margin: '0 0 0.3rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Confirm PIN</p>
                        <input type="password" inputMode="numeric" maxLength={4} value={fpConfirmPin}
                          onChange={e => { setFpConfirmPin(e.target.value.replace(/\D/g,'').slice(0,4)); setFpError('') }}
                          placeholder="••••"
                          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(0,0,0,0.18)', border: '2px solid rgba(111,207,151,0.4)', color: '#fff', fontSize: '1.1rem', letterSpacing: '0.45em', textAlign: 'center', boxSizing: 'border-box', outline: 'none', fontFamily: "'Albert Sans',sans-serif", transition: 'border-color 0.2s' }}
                          onFocus={e => e.target.style.borderColor = '#6FCF97'}
                          onBlur={e => e.target.style.borderColor = 'rgba(111,207,151,0.4)'} />
                      </div>
                    </div>
                    <button type="submit" disabled={fpStep === 'saving'}
                      style={{ width: '100%', padding: '0.88rem', borderRadius: 13, border: 'none', background: fpStep === 'saving' ? 'rgba(99,102,241,0.35)' : 'linear-gradient(135deg,#818cf8,#6366f1)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: fpStep === 'saving' ? 'not-allowed' : 'pointer', fontFamily: "'Albert Sans',sans-serif", boxShadow: '0 4px 20px rgba(99,102,241,0.3)', letterSpacing: '0.03em' }}>
                      {fpStep === 'saving' ? 'Saving…' : 'Set New PIN & Login'}
                    </button>
                  </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '0.8rem' }}>
                  <button type="button" onClick={resetFpFlow}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', cursor: 'pointer', fontFamily: "'Albert Sans',sans-serif" }}>
                    ← Back to PIN entry
                  </button>
                </div>
              </div>
            )}

            {/* Animated form area */}
            {!pinStep && <div key={animKey} style={{
              animation: `formSlide${slideDir === 'right' ? 'InRight' : 'InLeft'} 0.32s cubic-bezier(0.16,1,0.3,1) both`,
            }}>
              {/* Login form */}
              {tab === 'login' && (
                <form onSubmit={handleLogin}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.88)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                    Matric Number
                  </label>
                  <input
                    type="text" value={matric}
                    onChange={e => setMatric(e.target.value.toUpperCase())}
                    required
                    placeholder="e.g. 24010611002"
                    style={{ width: '100%', padding: '0.88rem 1rem', borderRadius: 13, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.06em', textAlign: 'center', marginBottom: '1rem', boxSizing: 'border-box', outline: 'none', fontFamily: "'Albert Sans',sans-serif", transition: 'border-color 0.2s' }}
                  />
                  <button type="submit" disabled={loading}
                    style={{ width: '100%', padding: '0.9rem', borderRadius: 13, border: 'none', background: loading ? 'rgba(47,160,132,0.35)' : 'linear-gradient(135deg,#2FA084,#1F6F5F)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Albert Sans',sans-serif", letterSpacing: '0.04em', boxShadow: loading ? 'none' : '0 4px 22px rgba(47,160,132,0.45)', transition: 'all 0.2s ease' }}>
                    {loading ? 'Checking…' : 'View My Attendance'}
                  </button>
                </form>
              )}

              {/* Enroll form */}
              {tab === 'enroll' && (
                <form onSubmit={handleEnrollCheck}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.88)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                    Matric Number
                  </label>
                  <input
                    type="text" value={enrollMatric}
                    onChange={e => setEnrollMatric(e.target.value.toUpperCase())}
                    required
                    placeholder="e.g. 24010611002"
                    style={{ width: '100%', padding: '0.88rem 1rem', borderRadius: 13, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.06em', textAlign: 'center', marginBottom: '0.5rem', boxSizing: 'border-box', outline: 'none', fontFamily: "'Albert Sans',sans-serif", transition: 'border-color 0.2s' }}
                  />
                  <p style={{ margin: '0 0 1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 1.5 }}>
                    Already enrolled? Contact admin to reset.
                  </p>
                  <button type="submit" disabled={loading}
                    style={{ width: '100%', padding: '0.9rem', borderRadius: 13, border: 'none', background: loading ? 'rgba(47,160,132,0.35)' : 'linear-gradient(135deg,#2FA084,#1F6F5F)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Albert Sans',sans-serif", letterSpacing: '0.04em', boxShadow: loading ? 'none' : '0 4px 22px rgba(47,160,132,0.45)', transition: 'all 0.2s ease' }}>
                    {loading ? 'Checking…' : 'Proceed to Face Enrollment'}
                  </button>
                </form>
              )}
            </div>}

            {/* Back to Home */}
            {!pinStep && <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
              <button onClick={() => navigate('/')}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 99, cursor: 'pointer', padding: '0.42rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.88)', fontSize: '0.74rem', fontWeight: 600, fontFamily: "'Albert Sans',sans-serif", transition: 'all 0.18s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.88)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ width: 13, height: 13 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Home
              </button>
            </div>}

          </div>
        </div>
      </div>

      {/* Slide dots */}
      <div style={{ position: 'absolute', bottom: '1.4rem', right: '1.6rem', zIndex: 20, display: 'flex', gap: '6px', alignItems: 'center' }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{ height: '5px', borderRadius: '99px', background: '#6FCF97', width: i === active ? '22px' : '5px', opacity: i === active ? 1 : 0.3, transition: 'all 0.4s ease' }} />
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box }
        input::placeholder { color: rgba(255,255,255,0.5) }
        input:focus { border-color: rgba(255,255,255,0.35) !important; outline: none }
        @keyframes formSlideInRight {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes formSlideInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
