import { useState, useEffect, useCallback } from 'react'
import { Send, Copy, Check, CheckCircle } from 'lucide-react'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { Spinner } from '@/components/ui/Spinner'
import { generateTelegramLinkCode, getTelegramLinked, unlinkTelegram, notifyStudent } from '@/services/studentService'

export default function StudentTelegramPage() {
  const matric = sessionStorage.getItem('studentMatric') || ''
  const name   = sessionStorage.getItem('studentName')   || 'Student'

  const [step,          setStep]          = useState('loading') // loading | unlinked | code | linked
  const [linkCode,      setLinkCode]      = useState('')
  const [copied,        setCopied]        = useState(false)
  const [checkLoading,  setCheckLoading]  = useState(false)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const [error,         setError]         = useState('')

  const checkStatus = useCallback(async () => {
    const linked = await getTelegramLinked(matric)
    setStep(linked ? 'linked' : 'unlinked')
  }, [matric])

  useEffect(() => { checkStatus() }, [checkStatus])

  async function handleGenerate() {
    setError('')
    setStep('generating')
    try {
      const code = await generateTelegramLinkCode(matric)
      setLinkCode(code)
      setStep('code')
    } catch (err) {
      setError(err?.message || 'Failed to generate code. Try again.')
      setStep('unlinked')
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(linkCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCheckStatus() {
    setCheckLoading(true)
    const linked = await getTelegramLinked(matric)
    if (linked) { setStep('linked'); setLinkCode('') }
    setCheckLoading(false)
  }

  async function handleUnlink() {
    setUnlinkLoading(true)
    try {
      await notifyStudent(matric, {
        text:
          `&#9888;&#65039; <b>TELEGRAM UNLINKED</b>\n` +
          `&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;&#x2015;\n` +
          `Hello <b>${name}</b>,\n\n` +
          `Your Telegram account has been <b>unlinked</b> from your GAPOSA profile.\n\n` +
          `You will no longer receive attendance notifications here.\n\n` +
          `To re-link, open the GAPOSA app → Profile → Telegram Alerts.\n\n` +
          `<i>EEE FACE-ID · Gateway ICT Polytechnic</i>`,
      }).catch(() => {})
      await unlinkTelegram(matric)
      setStep('unlinked')
    } catch { /* silent */ }
    setUnlinkLoading(false)
  }

  const isLinked = step === 'linked'

  return (
    <StudentLayout>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.25rem' }}>
          <AnimatedLabel text="Telegram Alerts" Icon={Send} />
        </div>
        <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 }}>
          {isLinked ? 'Telegram Connected' : 'Link Telegram'}
        </h1>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}>
          <div style={{ height: 4, background: isLinked ? 'linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97)' : 'linear-gradient(90deg,#0088cc,#29b6f6,#81d4fa)' }} />
          <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: isLinked ? 'rgba(47,160,132,0.1)' : 'rgba(0,136,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Send size={17} color={isLinked ? '#2FA084' : '#0088cc'} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>Telegram Notifications</p>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.3 }}>
                  {isLinked ? 'Attendance alerts sent directly to your Telegram' : 'Receive instant attendance alerts on Telegram'}
                </p>
              </div>
              {isLinked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(47,160,132,0.08)', border: '1px solid rgba(47,160,132,0.2)', borderRadius: 99, padding: '0.2rem 0.65rem' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2FA084' }} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#2FA084', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active</span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 8, padding: '0.45rem 0.7rem' }}>
                {error}
              </p>
            )}

            {/* Loading */}
            {step === 'loading' && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem' }}>
                <Spinner size={22} color="brand" />
              </div>
            )}

            {/* Unlinked */}
            {step === 'unlinked' && (
              <div>
                <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.6 }}>
                  Link your Telegram account to receive instant attendance notifications — present or absent — directly on your phone after every class.
                </p>
                <button onClick={handleGenerate}
                  style={{ width: '100%', background: 'linear-gradient(135deg,#0088cc,#006699)', border: 'none', borderRadius: 11, padding: '0.75rem', fontSize: '0.82rem', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px rgba(0,136,204,0.3)' }}>
                  Generate Link Code
                </button>
              </div>
            )}

            {/* Generating */}
            {step === 'generating' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0' }}>
                <Spinner size={16} color="brand" />
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Generating code…</span>
              </div>
            )}

            {/* Code display */}
            {step === 'code' && (
              <div>
                <p style={{ margin: '0 0 0.8rem', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                  Follow these steps:
                </p>
                <ol style={{ margin: '0 0 1rem', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>Open Telegram on your phone</li>
                  <li style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>Search <strong>@gaposa_eee_bot</strong> and tap <strong>Start</strong></li>
                  <li style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>Send the code below to the bot</li>
                </ol>

                {/* Code box */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1.5px solid #2FA084', borderRadius: 11, padding: '0.75rem 1rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 900, color: '#1F6F5F', letterSpacing: '0.15em' }}>
                    {linkCode}
                  </span>
                  <button onClick={handleCopy}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '2px 6px' }}>
                    {copied
                      ? <Check size={15} color="#059669" strokeWidth={2.5} />
                      : <Copy size={15} color="#2FA084" strokeWidth={2} />
                    }
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: copied ? '#059669' : '#2FA084' }}>
                      {copied ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>

                <p style={{ margin: '0 0 0.9rem', fontSize: '0.68rem', color: '#94a3b8' }}>
                  Code expires in 15 minutes.
                </p>

                <button onClick={handleCheckStatus} disabled={checkLoading}
                  style={{ width: '100%', background: 'linear-gradient(135deg,#2FA084,#1F6F5F)', border: 'none', borderRadius: 11, padding: '0.75rem', fontSize: '0.82rem', fontWeight: 700, color: '#fff', cursor: checkLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: checkLoading ? 0.6 : 1 }}>
                  {checkLoading ? 'Checking…' : 'Done — Confirm Link'}
                </button>
              </div>
            )}

            {/* Linked */}
            {step === 'linked' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(47,160,132,0.06)', border: '1px solid rgba(47,160,132,0.18)', borderRadius: 11, padding: '0.8rem 1rem', marginBottom: '1rem' }}>
                  <CheckCircle size={18} color="#2FA084" strokeWidth={2} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                      Account linked — {name.split(' ')[0]}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b' }}>
                      You will receive attendance alerts after every class
                    </p>
                  </div>
                </div>
                <button onClick={handleUnlink} disabled={unlinkLoading}
                  style={{ width: '100%', background: 'none', border: '1.5px solid #fecaca', borderRadius: 11, padding: '0.65rem', fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', cursor: unlinkLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: unlinkLoading ? 0.5 : 1 }}>
                  {unlinkLoading ? 'Unlinking…' : 'Unlink Telegram'}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
