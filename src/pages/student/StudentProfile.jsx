import { useState, useEffect, useCallback, useRef } from 'react'
import { User, Send, CheckCircle, XCircle, Copy, Check, X } from 'lucide-react'

function PhotoLightbox({ src, alt = 'Photo', label = '', onClose }) {
  const [scale,  setScale]  = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos  = useRef({ x: 0, y: 0 })
  const lastDist = useRef(null)

  function zoom(delta) {
    setScale(s => {
      const next = Math.min(4, Math.max(1, parseFloat((s + delta).toFixed(2))))
      if (next === 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }

  function onWheel(e) { e.preventDefault(); zoom(e.deltaY < 0 ? 0.2 : -0.2) }
  function onMouseDown(e) {
    if (scale <= 1) return
    dragging.current = true
    lastPos.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
  }
  function onMouseMove(e) {
    if (!dragging.current) return
    setOffset({ x: e.clientX - lastPos.current.x, y: e.clientY - lastPos.current.y })
  }
  function onMouseUp() { dragging.current = false }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDist.current = Math.hypot(dx, dy)
    } else if (e.touches.length === 1 && scale > 1) {
      dragging.current = true
      lastPos.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y }
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 2 && lastDist.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      zoom((dist - lastDist.current) / 120)
      lastDist.current = dist
    } else if (e.touches.length === 1 && dragging.current) {
      setOffset({ x: e.touches[0].clientX - lastPos.current.x, y: e.touches[0].clientY - lastPos.current.y })
    }
  }
  function onTouchEnd() { dragging.current = false; lastDist.current = null }

  return (
    <div onClick={e => e.stopPropagation()}
      style={{ background: '#fff', borderRadius: 22, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', overflow: 'hidden', maxWidth: '92vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', width: 420 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label || 'Photo'}</p>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', cursor: scale > 1 ? 'grab' : 'default', userSelect: 'none', minHeight: 240 }}
        onWheel={onWheel}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <img src={src} alt={alt} draggable={false}
          onDoubleClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
          style={{
            maxWidth: '72vw', maxHeight: '52vh', display: 'block',
            borderRadius: scale > 1 ? 4 : 14, objectFit: 'contain',
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
            transformOrigin: 'center',
            transition: dragging.current ? 'none' : 'transform 0.18s ease',
            userSelect: 'none', WebkitUserSelect: 'none',
            boxShadow: scale === 1 ? '0 8px 32px rgba(31,111,95,0.15)' : 'none',
          }} />
      </div>
      <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button onClick={() => zoom(-0.25)} disabled={scale <= 1}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: scale > 1 ? 'pointer' : 'not-allowed', opacity: scale <= 1 ? 0.35 : 1, fontSize: '1.2rem', lineHeight: 1, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', minWidth: 38, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
        <button onClick={() => zoom(0.25)} disabled={scale >= 4}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: scale < 4 ? 'pointer' : 'not-allowed', opacity: scale >= 4 ? 0.35 : 1, fontSize: '1.2rem', lineHeight: 1, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        {scale > 1 && (
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
            style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2FA084', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '0 4px' }}>Reset</button>
        )}
        <span style={{ flex: 1, fontSize: '0.6rem', color: '#cbd5e1', textAlign: 'center' }}>
          {scale === 1 ? 'Scroll or + to zoom' : 'Drag to pan · double-tap to reset'}
        </span>
      </div>
    </div>
  )
}
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { generateTelegramLinkCode, getTelegramLinked, unlinkTelegram, notifyStudent } from '@/services/studentService'

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
  const [lightbox,       setLightbox]       = useState(false)
  const [qrDataUrl,     setQrDataUrl]     = useState('')
  const qrGenerated = useRef(false)

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
      .select('matric,name,level,option,enrolled,telegram_chat_id,photo_url')
      .ilike('matric', matric)
      .single()
    setStudent(data)
    setTelegramLinked(!!data?.telegram_chat_id)
    setLoading(false)
  }, [matric])

  useEffect(() => { loadStudent() }, [loadStudent])

  useEffect(() => {
    if (!matric || qrGenerated.current) return
    qrGenerated.current = true
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(matric.toUpperCase(), { width: 200, margin: 1, color: { dark: '#1F6F5F', light: '#ffffff' } })
        .then(setQrDataUrl)
    }).catch(() => {})
  }, [matric])

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
    try {
      const name = student?.name || ''
      await notifyStudent(matric, {
        text:
          `&#9888;&#65039; <b>TELEGRAM UNLINKED</b>\n` +
          `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
          `Hello <b>${name.split(' ')[0] || 'Student'}</b>,\n\n` +
          `Your Telegram account has been <b>unlinked</b> from your GAPOSA profile.\n\n` +
          `You will no longer receive attendance notifications here.\n\n` +
          `To re-link, open the GAPOSA app → Profile → Telegram Alerts.\n\n` +
          `<i>EEE FACE-ID · Gateway ICT Polytechnic</i>`,
      }).catch(() => {})
      await unlinkTelegram(matric)
    } catch { /* silent */ }
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

      {/* Photo lightbox */}
      {lightbox && student?.photo_url && (
        <div onClick={() => setLightbox(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <PhotoLightbox src={student.photo_url} alt={student.name} label="My Photo" onClose={() => setLightbox(false)} />
        </div>
      )}

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
            {student?.photo_url ? (
              <button onClick={() => setLightbox(true)} title="Click to view full photo"
                style={{ border: 'none', padding: 0, background: 'transparent', cursor: 'zoom-in', flexShrink: 0, borderRadius: '50%', position: 'relative' }}>
                <img src={student.photo_url} alt={student.name}
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', display: 'block', boxShadow: '0 3px 14px rgba(31,111,95,0.3)', border: '2px solid rgba(47,160,132,0.3)' }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: '50%', background: '#2FA084', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ width: 9, height: 9 }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                </div>
              </button>
            ) : (
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
            )}
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

        {/* ── QR Code card ── */}
        <div style={CARD}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
            Attendance QR Code
          </h3>
          <p style={{ margin: '0 0 0.85rem', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.55 }}>
            Show this to your lecturer when the face scanner is offline. It encodes your matric number.
          </p>
          {qrDataUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: 12, background: '#fff', border: '1.5px solid rgba(47,160,132,0.25)', borderRadius: 14, boxShadow: '0 2px 12px rgba(31,111,95,0.1)' }}>
                <img src={qrDataUrl} alt={`QR code for ${matric}`} style={{ width: 160, height: 160, display: 'block' }} />
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700, color: '#2FA084', letterSpacing: '0.08em' }}>{matric}</p>
            </div>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 20, height: 20, border: '2px solid #2FA084', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          )}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

      </div>
    </StudentLayout>
  )
}
