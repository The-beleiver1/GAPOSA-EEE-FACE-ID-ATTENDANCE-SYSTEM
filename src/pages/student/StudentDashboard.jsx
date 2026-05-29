import { useState, useEffect, useRef } from 'react' // useRef kept for AnimatedGreeting
import { BookMarked, ShieldAlert, LayoutDashboard } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { getAttendanceSummary } from '@/services/studentService'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { Spinner } from '@/components/ui/Spinner'

// ── Dashboard sub-components ──────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function AnimatedGreeting({ greetingText, nameText }) {
  const [gChars,  setGChars]  = useState(greetingText.length)
  const [nChars,  setNChars]  = useState(nameText.length)
  const [xOffset, setXOffset] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const [trans,   setTrans]   = useState('none')
  const timerRef = useRef(null)
  const ivRef    = useRef(null)

  useEffect(() => {
    function clear() { clearTimeout(timerRef.current); clearInterval(ivRef.current) }
    function cycle() {
      clear()
      setGChars(greetingText.length); setNChars(nameText.length)
      setXOffset(0); setOpacity(1)
      setTrans('transform 1.2s ease-in, opacity 0.5s ease')
      timerRef.current = setTimeout(() => {
        setXOffset(-38)
        let g = greetingText.length, n = nameText.length
        ivRef.current = setInterval(() => {
          if (g > 0) { g--; setGChars(g) }
          if (n > 0) { n--; setNChars(n) }
          if (g <= 0 && n <= 0) {
            clearInterval(ivRef.current); setOpacity(0)
            timerRef.current = setTimeout(() => {
              setTrans('none'); setXOffset(38); setGChars(0); setNChars(0)
              requestAnimationFrame(() => requestAnimationFrame(() => {
                setTrans('transform 1.8s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease')
                setXOffset(0); setOpacity(1)
                let gi = 0, ni = 0
                ivRef.current = setInterval(() => {
                  if (gi < greetingText.length) { gi++; setGChars(gi) }
                  if (ni < nameText.length)      { ni++; setNChars(ni) }
                  if (gi >= greetingText.length && ni >= nameText.length) {
                    clearInterval(ivRef.current)
                    timerRef.current = setTimeout(cycle, 4000)
                  }
                }, 95)
              }))
            }, 440)
          }
        }, 95)
      }, 4200)
    }
    cycle()
    return clear
  }, [greetingText, nameText])

  return (
    <div style={{ transform: `translateX(${xOffset}px) translateZ(0)`, opacity, transition: trans, willChange: 'transform, opacity', isolation: 'isolate' }}>
      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', margin: '0 0 0.1rem', fontWeight: 500, minHeight: '1.5em' }}>
        {greetingText.slice(0, gChars) || '​'}
      </p>
      <h1 style={{ color: '#fff', fontSize: 'clamp(1.35rem, 4.5vw, 2rem)', fontWeight: 800, margin: 0, lineHeight: 1.05, fontFamily: 'inherit', letterSpacing: '0.01em', whiteSpace: 'nowrap', display: 'inline-block', minHeight: '1em' }}>
        {nameText.slice(0, nChars) || '​'}
      </h1>
    </div>
  )
}

function CircularGauge({ pct, color }) {
  const R = 46, C = 2 * Math.PI * R
  const dash = (Math.min(pct, 100) / 100) * C
  return (
    <svg width={124} height={124} viewBox="0 0 124 124" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={62} cy={62} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
      <circle cx={62} cy={62} r={R} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${C}`} strokeLinecap="round"
        transform="rotate(-90 62 62)"
        style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color}88)` }}
      />
      <text x={62} y={57} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={26} fontWeight={900} fontFamily="inherit">{pct}%</text>
      <text x={62} y={76} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.45)" fontSize={8} fontWeight={600} fontFamily="inherit" letterSpacing="2">ATTENDANCE</text>
    </svg>
  )
}

function CountUp({ value }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    const duration = 900, startTime = performance.now()
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1)
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 4))))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])
  return display
}

function RiskRing({ atRisk, total, color }) {
  const size = 68, r = size / 2 - 7, C = 2 * Math.PI * r
  const pct = total > 0 ? Math.round((atRisk / total) * 100) : 0
  const dash = (pct / 100) * C
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${C}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 5px ${color}88)` }}
      />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={12} fontWeight={800} fontFamily="inherit">{pct}%</text>
    </svg>
  )
}

function CourseDots({ count, color }) {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    setVisible(0)
    if (count === 0) return
    let i = 0
    const iv = setInterval(() => { i++; setVisible(i); if (i >= count) clearInterval(iv) }, 90)
    return () => clearInterval(iv)
  }, [count])
  const GRID_MAX = 12, dots = Math.min(count, GRID_MAX)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: '0.85rem', minHeight: 13 }}>
      {Array.from({ length: dots }).map((_, i) => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: i < visible ? color : `${color}22`, boxShadow: i < visible ? `0 0 6px ${color}66` : 'none', transition: 'background 0.25s ease, box-shadow 0.25s ease', flexShrink: 0 }} />
      ))}
      {count > GRID_MAX && <span style={{ color: `${color}88`, fontSize: '0.62rem', fontWeight: 700, alignSelf: 'center', fontFamily: 'inherit' }}>+{count - GRID_MAX}</span>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { profile } = useAuthStore()
  const navigate    = useNavigate()
  const matric      = profile?.matric || sessionStorage.getItem('studentMatric')
  const name        = profile?.name   || sessionStorage.getItem('studentName') || 'Student'

  const [summary, setSummary] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!matric) return
    Promise.all([
      getAttendanceSummary(matric),
      supabase.from('students').select('level, option').eq('matric', matric).single(),
    ]).then(([s, { data }]) => {
      setSummary(s)
      if (data) setStudent(data)
    }).finally(() => setLoading(false))
  }, [matric])

  const courseMap = {}
  for (const rec of (summary?.records || [])) {
    const cid = rec.course_id || 'Unknown'
    if (!courseMap[cid]) courseMap[cid] = { total: 0, present: 0 }
    courseMap[cid].total++
    if (rec.status === 'present' || rec.present) courseMap[cid].present++
  }
  const courses    = Object.entries(courseMap)
  const atRisk     = courses.filter(([, c]) => c.total > 0 && Math.round(c.present / c.total * 100) < 75)
  const overallPct      = summary?.percentage || 0
  const totalClasses    = summary?.total      || 0
  const attendedClasses = summary?.attended   || 0
  const firstName       = name.split(' ').slice(0, 2).join(' ')

  // Streak: consecutive most-recent sessions all present
  const allRecs = (summary?.records || []).slice().sort((a, b) => new Date(b.timestamp||b.date) - new Date(a.timestamp||a.date))
  let streak = 0
  for (const r of allRecs) { if (r.status === 'present' || r.present) streak++; else break }

  // Color thresholds deliberately offset from the 75% eligibility mark so the ring
  // colour change never signals "you crossed the threshold"
  const pctColor  = overallPct >= 90 ? '#6FCF97' : overallPct >= 60 ? '#fbbf24' : '#ff8080'
  // Semester progress: attended / expected-semester-total (15 classes per course, per semester)
  // Ring fill grows naturally from 0→100% over the semester; attendance rate shown as secondary text
  const estimatedSemesterTotal = Math.max(courses.length * 15, totalClasses)
  const semesterPct = estimatedSemesterTotal > 0
    ? Math.min(Math.round((attendedClasses / estimatedSemesterTotal) * 100), 100)
    : 0
  // No celebratory green when 0 at risk — use neutral brand teal so it never signals "you can rest"
  const riskColor  = atRisk.length > 0 ? '#b91c1c' : '#2FA084'
  const riskIconBg = atRisk.length > 0 ? '#fee2e2' : 'rgba(47,160,132,0.10)'

  return (
    <StudentLayout>
      <style>{`
        @keyframes riskPulse { 0%,100%{box-shadow:0 0 0 0 rgba(185,28,28,0.45)}50%{box-shadow:0 0 0 8px rgba(185,28,28,0)} }
        @keyframes riskGlow  { 0%,100%{filter:drop-shadow(0 0 3px rgba(185,28,28,0.5))}50%{filter:drop-shadow(0 0 10px rgba(185,28,28,0.9))} }
      `}</style>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Spinner size={36} color="white" />
        </div>
      ) : (
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>

          {/* ── Animated page label ── */}
          <div style={{ marginBottom: '0.5rem' }}>
            <AnimatedLabel text="Overview" Icon={LayoutDashboard} />
          </div>

          {/* ── Hero card ── */}
          <div style={{ background: 'linear-gradient(135deg, #1F6F5F 0%, #2FA084 100%)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(31,111,95,0.28)' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg, rgba(111,207,151,0.5), rgba(255,255,255,0.35), rgba(111,207,151,0.5))' }} />
            <div style={{ padding: 'clamp(1rem, 4vw, 1.75rem) clamp(1rem, 4vw, 2rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <AnimatedGreeting greetingText={`${greeting()},`} nameText={firstName.toUpperCase()} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.72rem', letterSpacing: '0.06em', fontFamily: 'inherit' }}>{matric}</span>
                  {student?.level && <span style={{ background: 'rgba(111,207,151,0.22)', color: '#6FCF97', fontSize: '0.65rem', fontWeight: 700, padding: '0.12rem 0.55rem', borderRadius: 99, border: '1px solid rgba(111,207,151,0.45)' }}>{student.level}</span>}
                  {student?.option && <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', fontSize: '0.65rem', fontWeight: 600, padding: '0.12rem 0.55rem', borderRadius: 99, border: '1px solid rgba(255,255,255,0.22)' }}>{student.option}</span>}
                </div>
              </div>
              <svg width={124} height={124} viewBox="0 0 124 124"
                style={{ display: 'block', flexShrink: 0, width: 'clamp(112px, 28vw, 148px)', height: 'clamp(112px, 28vw, 148px)' }}>
                {(() => { const R=46,C=2*Math.PI*R,dash=(semesterPct/100)*C; return (<>
                  <circle cx={62} cy={62} r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={10}/>
                  <circle cx={62} cy={62} r={R} fill="none" stroke={pctColor} strokeWidth={10}
                    strokeDasharray={`${dash} ${C}`} strokeLinecap="round" transform="rotate(-90 62 62)"
                    style={{transition:'stroke-dasharray 1.4s cubic-bezier(0.34,1.56,0.64,1)',filter:`drop-shadow(0 0 8px ${pctColor}aa)`}}/>
                  {/* Primary metric */}
                  <text x={62} y={46} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={27} fontWeight={900} fontFamily="inherit" letterSpacing="-0.5">{semesterPct}%</text>
                  {/* Hairline divider */}
                  <line x1={40} y1={59} x2={84} y2={59} stroke="rgba(255,255,255,0.2)" strokeWidth={0.75}/>
                  {/* Attendance rate — clearly visible secondary label */}
                  <text x={62} y={69} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.92)" fontSize={12} fontWeight={700} fontFamily="inherit" letterSpacing="0.2">{overallPct}% rate</text>
                  {/* Class count — tertiary context */}
                  <text x={62} y={81} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.65)" fontSize={9} fontWeight={600} fontFamily="inherit" letterSpacing="0.1">{attendedClasses} of {totalClasses} classes</text>
                </>)})()}
              </svg>
            </div>
          </div>

          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* ENROLLED */}
            <div onClick={() => navigate('/student/attendance', { state: { tab: 'all', filter: 'all' } })}
              style={{ position: 'relative', overflow: 'hidden', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 24, padding: '0 0 1.4rem', cursor: 'pointer', transition: 'transform 0.22s, box-shadow 0.22s', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(29,78,216,0.14)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(31,111,95,0.07)' }}
            >
              <div style={{ height: 4, background: 'linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97)', borderRadius: '24px 24px 0 0', marginBottom: '1.4rem' }} />
              <div style={{ padding: '0 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <p style={{ color: '#4b5563', fontSize: '0.72rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Enrolled</p>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(47,160,132,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookMarked size={15} color="#2FA084" strokeWidth={2} />
                  </div>
                </div>
                <p style={{ color: '#1F6F5F', fontSize: '3rem', fontWeight: 900, margin: '0 0 0.2rem', lineHeight: 1 }}>
                  <CountUp value={courses.length} />
                </p>
                <p style={{ color: '#6b7280', fontSize: '0.82rem', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>Courses registered this semester</p>
                <CourseDots count={courses.length} color="#2FA084" />
              </div>
              <p style={{ position: 'absolute', bottom: -20, right: 6, color: 'rgba(31,111,95,0.05)', fontSize: '5rem', fontWeight: 900, margin: 0, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>{courses.length}</p>
            </div>

            {/* AT RISK */}
            <div onClick={() => navigate('/student/attendance', { state: { tab: 'all', filter: 'atrisk' } })}
              style={{ position: 'relative', overflow: 'hidden', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 24, padding: '0 0 1.4rem', cursor: 'pointer', transition: 'transform 0.22s, box-shadow 0.22s', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = atRisk.length > 0 ? '0 12px 40px rgba(185,28,28,0.14)' : '0 12px 40px rgba(31,111,95,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(31,111,95,0.07)' }}
            >
              <div style={{ height: 4, background: atRisk.length > 0 ? 'linear-gradient(90deg,#b91c1c,#ef4444,#fca5a5)' : 'linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97)', borderRadius: '24px 24px 0 0', marginBottom: '1.4rem' }} />
              <div style={{ padding: '0 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <p style={{ color: '#4b5563', fontSize: '0.72rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'inherit' }}>At Risk</p>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: riskIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: atRisk.length > 0 ? 'riskPulse 1.8s ease-in-out infinite' : 'none' }}>
                    <ShieldAlert size={15} color={riskColor} strokeWidth={2} style={{ animation: atRisk.length > 0 ? 'riskGlow 1.8s ease-in-out infinite' : 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <p style={{ color: riskColor, fontSize: '3rem', fontWeight: 900, margin: '0 0 0.2rem', lineHeight: 1 }}>
                    <CountUp value={atRisk.length} />
                  </p>
                  <div style={{ paddingBottom: '0.25rem', flexShrink: 0 }}>
                    <RiskRing atRisk={atRisk.length} total={courses.length} color={riskColor} />
                  </div>
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.82rem', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>Courses below 75% attendance</p>
              </div>
              <p style={{ position: 'absolute', bottom: -20, right: 6, color: `${riskColor}08`, fontSize: '5rem', fontWeight: 900, margin: 0, fontFamily: 'inherit', lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>{atRisk.length}</p>
            </div>

          </div>

          {/* ── Streak card ── */}
          {allRecs.length > 0 && (
            <div style={{ background: streak >= 5 ? 'linear-gradient(135deg,#1F6F5F,#2FA084)' : '#fff', border: '1px solid #f1f5f9', borderRadius: 24, padding: '1.25rem 1.5rem', boxShadow: '0 2px 12px rgba(31,111,95,0.07)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: streak >= 5 ? 'rgba(255,255,255,0.15)' : 'rgba(47,160,132,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '1.75rem' }}>{streak >= 10 ? '🔥' : streak >= 5 ? '⭐' : streak >= 2 ? '✅' : streak >= 1 ? '🎯' : '📋'}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: streak >= 5 ? 'rgba(255,255,255,0.7)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Attendance Streak</p>
                <p style={{ margin: '0.1rem 0 0', fontSize: '1.5rem', fontWeight: 900, color: streak >= 5 ? '#fff' : '#1F6F5F', lineHeight: 1 }}>
                  {streak} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>in a row</span>
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.73rem', color: streak >= 5 ? 'rgba(255,255,255,0.75)' : '#64748b', lineHeight: 1.4 }}>
                  {streak === 0 ? 'Attend your next class to start a streak' : streak === 1 ? 'Great start! Attend your next class to keep the momentum.' : streak >= 10 ? 'Outstanding! Keep it going!' : streak >= 5 ? 'Great consistency — keep attending every class!' : 'Keep attending every class to grow your streak'}
                </p>
              </div>
            </div>
          )}

        </div>
      )}
    </StudentLayout>
  )
}
