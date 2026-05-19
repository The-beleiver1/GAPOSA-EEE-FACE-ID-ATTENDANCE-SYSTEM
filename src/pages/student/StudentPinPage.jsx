import { useState, useEffect } from 'react'
import { KeyRound, Shield } from 'lucide-react'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { saveStudentPin, verifyStudentPin, hasStudentPin } from '@/services/studentService'

const CARD = { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 18, boxShadow: '0 2px 12px rgba(31,111,95,0.07)', padding: '1.4rem 1.6rem' }
const LBL  = { fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.4rem', display: 'block' }
const INP  = { width: '100%', padding: '0.7rem 0.9rem', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: '1rem', color: '#1e293b', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', boxSizing: 'border-box', transition: 'border-color 0.2s', letterSpacing: '0.3em', textAlign: 'center' }

export default function StudentPinPage() {
  const { toast }  = useToast()
  const matric     = sessionStorage.getItem('studentMatric') || ''
  const [hasPIN,     setHasPIN]     = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin,     setNewPin]     = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinErr,     setPinErr]     = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  useEffect(() => {
    if (!matric) return
    hasStudentPin(matric).then(v => { setHasPIN(v); setLoading(false) })
  }, [matric])

  async function handlePinSave() {
    setPinErr('')
    if (!/^\d{4}$/.test(newPin)) { setPinErr('PIN must be exactly 4 digits'); return }
    if (newPin !== confirmPin)    { setPinErr('PINs do not match'); return }
    if (hasPIN) {
      const ok = await verifyStudentPin(matric, currentPin)
      if (!ok) { setPinErr('Current PIN is incorrect'); return }
    }
    setPinLoading(true)
    try {
      await saveStudentPin(matric, newPin)
      setHasPIN(true)
      setCurrentPin(''); setNewPin(''); setConfirmPin('')
      toast(hasPIN ? 'PIN changed successfully' : 'PIN set up successfully', 'success')
    } catch (err) {
      setPinErr('Failed to save PIN: ' + err.message)
    } finally {
      setPinLoading(false)
    }
  }

  if (loading) return (
    <StudentLayout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner size={28} color="brand" />
      </div>
    </StudentLayout>
  )

  return (
    <StudentLayout>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.25rem' }}>
          <AnimatedLabel text="PIN Security" Icon={KeyRound} />
        </div>
        <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 }}>
          {hasPIN ? 'Change Your PIN' : 'Set Up Your PIN'}
        </h1>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', paddingBottom: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={15} color="#6366f1" />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', flex: 1 }}>PIN Security</h3>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: hasPIN ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: hasPIN ? '#059669' : '#d97706' }}>
              {hasPIN ? 'ACTIVE' : 'NOT SET'}
            </span>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.75rem 1rem', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#6b7280', lineHeight: 1.65 }}>
              {hasPIN
                ? 'Your 4-digit PIN protects your attendance portal. Enter your current PIN to change it.'
                : "Set a 4-digit PIN to secure your attendance portal. You'll be prompted for it on every login."}
            </p>
          </div>

          {pinErr && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 9, padding: '0.55rem 0.8rem', marginBottom: '0.9rem' }}>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#dc2626', fontWeight: 600 }}>{pinErr}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {hasPIN && (
              <div>
                <label style={LBL}>Current PIN</label>
                <input style={INP} type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                  value={currentPin}
                  onChange={e => { setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinErr('') }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
            )}
            <div>
              <label style={LBL}>{hasPIN ? 'New PIN' : 'Set PIN (4 digits)'}</label>
              <input style={INP} type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                value={newPin}
                onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinErr('') }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            <div>
              <label style={LBL}>Confirm PIN</label>
              <input style={INP} type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                value={confirmPin}
                onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinErr('') }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            <button onClick={handlePinSave} disabled={pinLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '0.78rem', borderRadius: 11, border: 'none', background: pinLoading ? '#94a3b8' : 'linear-gradient(135deg,#818cf8,#6366f1)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: pinLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px rgba(99,102,241,0.25)', transition: 'all 0.2s' }}>
              {pinLoading ? <Spinner size={14} /> : <Shield size={14} />}
              {hasPIN ? 'Change PIN' : 'Set PIN'}
            </button>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
