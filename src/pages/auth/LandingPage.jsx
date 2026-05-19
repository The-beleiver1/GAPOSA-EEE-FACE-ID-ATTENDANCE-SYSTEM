import logo from '../../assets/gaposa-logo.png'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import img1 from '@/assets/electric-pole-foggy-day.jpg'
import img2 from '@/assets/warm-filament-bulbs-cast-cozy-amber-glow-dimly-lit-room.jpg'
import img3 from '@/assets/sun-setting-silhouette-electricity-pylons.jpg'

const SLIDES = [img1, img2, img3]

const ROLES = [
  {
    key: 'lecturer',
    label: 'Lecturer',
    desc: 'Take attendance & manage courses',
    route: '/auth/lecturer',
    color: '#6FCF97',
    colorAlt: '#a8e6c1',
    grad: 'linear-gradient(135deg, #1F6F5F 0%, #2FA084 100%)',
    rowGrad: 'linear-gradient(90deg, rgba(111,207,151,0.18) 0%, rgba(111,207,151,0.04) 100%)',
    glow: 'rgba(111,207,151,0.40)',
    stripGrad: 'linear-gradient(180deg, #6FCF97, #2FA084)',
    // Graduation cap — universally recognised academic/lecturer symbol
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 28, height: 28 }}>
        {/* Cap flat board (diamond) */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 9L12 4 2 9l10 5 10-5z" fill="currentColor" fillOpacity={0.15} />
        {/* Cap skirt sides drooping down */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 11.5V16c0 2.5 2.7 4 6 4s6-1.5 6-4v-4.5" />
        {/* Tassel cord */}
        <path strokeLinecap="round" d="M22 9v5.5" />
        {/* Tassel bob */}
        <circle cx="22" cy="15.2" r="0.95" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: 'student',
    label: 'Student',
    desc: 'View attendance & enroll face ID',
    route: '/auth/student',
    color: '#2FA084',
    colorAlt: '#6FCF97',
    grad: 'linear-gradient(135deg, #1F6F5F 0%, #2FA084 100%)',
    rowGrad: 'linear-gradient(90deg, rgba(47,160,132,0.18) 0%, rgba(47,160,132,0.04) 100%)',
    glow: 'rgba(47,160,132,0.40)',
    stripGrad: 'linear-gradient(180deg, #2FA084, #1F6F5F)',
    // Biometric face-scan frame + face + mini cap — face-ID student enrollment
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} style={{ width: 28, height: 28 }}>
        {/* Scan frame — top-left */}
        <path strokeLinecap="round" d="M3 8.5V5.5A2.5 2.5 0 015.5 3H8.5" />
        {/* Scan frame — top-right */}
        <path strokeLinecap="round" d="M15.5 3H18.5A2.5 2.5 0 0121 5.5V8.5" />
        {/* Scan frame — bottom-right */}
        <path strokeLinecap="round" d="M21 15.5V18.5A2.5 2.5 0 0118.5 21H15.5" />
        {/* Scan frame — bottom-left */}
        <path strokeLinecap="round" d="M8.5 21H5.5A2.5 2.5 0 013 18.5V15.5" />
        {/* Face circle */}
        <circle cx="12" cy="13" r="3.8" fill="currentColor" fillOpacity="0.1" strokeWidth={1.4} />
        {/* Left eye */}
        <circle cx="10.4" cy="12" r="0.75" fill="currentColor" stroke="none" />
        {/* Right eye */}
        <circle cx="13.6" cy="12" r="0.75" fill="currentColor" stroke="none" />
        {/* Smile */}
        <path strokeLinecap="round" d="M10 14.2a2.6 2.6 0 004 0" strokeWidth={1.4} />
        {/* Mini mortarboard on head */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.2 9.8l2.8-1.6 2.8 1.6-2.8 1.4z" fill="currentColor" fillOpacity="0.18" strokeWidth={1.35} />
      </svg>
    ),
  },
  {
    key: 'hod',
    label: 'HOD / Admin',
    desc: 'Manage system, students & reports',
    route: '/auth/admin',
    color: '#EEEEEE',
    colorAlt: '#ffffff',
    grad: 'linear-gradient(135deg, #1F6F5F 0%, #2FA084 100%)',
    rowGrad: 'linear-gradient(90deg, rgba(238,238,238,0.12) 0%, rgba(238,238,238,0.03) 100%)',
    glow: 'rgba(111,207,151,0.35)',
    stripGrad: 'linear-gradient(180deg, #EEEEEE, #6FCF97)',
    // Landmark / institution building — authority, administration
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 28, height: 28 }}>
        {/* Pediment roof */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 11.5L12 3l10 8.5" fill="currentColor" fillOpacity={0.1} />
        {/* Frieze bar below roof */}
        <path strokeLinecap="round" d="M2 11.5h20" />
        {/* Three classical columns */}
        <path strokeLinecap="round" d="M6 11.5v7.5" />
        <path strokeLinecap="round" d="M12 11.5v7.5" />
        <path strokeLinecap="round" d="M18 11.5v7.5" />
        {/* Stylobate / base step */}
        <path strokeLinecap="round" d="M3 19h18" />
        {/* Ground / bottom line */}
        <path strokeLinecap="round" d="M1 21.5h22" />
      </svg>
    ),
  },
]

export default function LandingPage() {
  const navigate  = useNavigate()
  const [hovered, setHovered] = useState(null)
  const [active,  setActive]  = useState(0)
  const [entered, setEntered] = useState(false)
  const [clicked, setClicked] = useState(null)

  useEffect(() => {
    const iv = setInterval(() => setActive(s => (s + 1) % SLIDES.length), 4500)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60)
    return () => clearTimeout(t)
  }, [])

  function handleNav(role) {
    setClicked(role.key)
    setTimeout(() => navigate(role.route), 180)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Albert Sans', sans-serif" }}>

      {/* ── Background slides ── */}
      {SLIDES.map((src, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === active ? 1 : 0, zIndex: i === active ? 1 : 0, transition: 'opacity 1.4s ease' }} />
      ))}
      {/* Deep dark overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(135deg, rgba(31,111,95,0.82) 0%, rgba(31,111,95,0.65) 50%, rgba(31,111,95,0.86) 100%)' }} />

      {/* ── Animated ambient orbs ── */}
      <div className="orb orb1" style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(111,207,151,0.12) 0%, transparent 68%)', top: '-8%', left: '-8%', zIndex: 3, pointerEvents: 'none' }} />
      <div className="orb orb2" style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,160,132,0.10) 0%, transparent 68%)', bottom: '-5%', right: '-6%', zIndex: 3, pointerEvents: 'none' }} />
      <div className="orb orb3" style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,111,95,0.09) 0%, transparent 68%)', top: '42%', right: '8%', zIndex: 3, pointerEvents: 'none' }} />

      {/* ── Card ── */}
      <div className="mainCard" style={{
        position: 'relative', zIndex: 10,
        width: '90vw', maxWidth: 428,
        borderRadius: 30,
        background: 'rgba(255,255,255,0.052)',
        backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)',
        border: '1px solid rgba(255,255,255,0.11)',
        overflow: 'hidden',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.95)',
        transition: 'opacity 0.65s ease, transform 0.65s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Animated shimmer top bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #1F6F5F, #2FA084, #6FCF97, #2FA084, #1F6F5F)', backgroundSize: '300% 100%', animation: 'shimmerBar 4s linear infinite' }} />

        {/* Inner top glow */}
        <div style={{ position: 'absolute', top: 3, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(111,207,151,0.30), transparent)', pointerEvents: 'none' }} />

        {/* ── Header ── */}
        <div style={{ padding: '1.6rem 1.8rem 1.3rem', display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div style={{ width: 68, height: 68, flexShrink: 0, borderRadius: 20, background: '#fff', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 9, overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)' }}>
            <img src={logo} alt="GAPOSA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Albert Sans',sans-serif", fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '0.03em', lineHeight: 1.0, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
              EEE FACE-ID
            </h1>
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.48)', margin: '0.18rem 0 0', fontWeight: 500, letterSpacing: '0.02em' }}>
              Face Recognition Attendance System
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6FCF97', margin: '0.18rem 0 0', fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.3 }}>
              Gateway ICT Polytechnic
            </p>
            <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.42)', margin: '0.08rem 0 0', fontWeight: 500, letterSpacing: '0.03em' }}>
              Electrical/Electronics Engineering Dept. · Saapade
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(111,207,151,0.28), transparent)', margin: '0 1.8rem' }} />

        {/* Role prompt */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', padding: '1rem 0 0.6rem' }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1))', margin: '0 1.8rem 0 1.8rem' }} />
          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap' }}>
            Select your role
          </p>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)', margin: '0 1.8rem 0 1.8rem' }} />
        </div>

        {/* ── Role buttons ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', padding: '0.2rem 1.5rem 1.5rem' }}>
          {ROLES.map((role, idx) => {
            const isHov = hovered === role.key
            const isCli = clicked === role.key
            return (
              <button
                key={role.key}
                onClick={() => handleNav(role)}
                onMouseEnter={() => setHovered(role.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: 0,
                  borderRadius: 18,
                  border: `1.5px solid ${isHov ? role.color + '55' : 'rgba(255,255,255,0.08)'}`,
                  background: isHov ? role.rowGrad : 'rgba(255,255,255,0.038)',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  overflow: 'hidden',
                  transform: isCli ? 'scale(0.97)' : isHov ? 'translateY(-3px) scale(1.012)' : 'translateY(0) scale(1)',
                  transition: 'all 0.28s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: isHov ? `0 10px 40px ${role.glow}, 0 2px 10px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.15)',
                  animation: entered ? `roleSlideIn 0.55s ${0.15 + idx * 0.12}s cubic-bezier(0.16,1,0.3,1) both` : 'none',
                }}
              >
                {/* Colored left accent strip */}
                <div style={{ width: 4, alignSelf: 'stretch', flexShrink: 0, background: isHov ? role.stripGrad : `${role.color}22`, borderRadius: '18px 0 0 18px', transition: 'background 0.28s ease' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.95rem 1rem 0.95rem 1rem', flex: 1 }}>
                  {/* Icon */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: isHov ? role.grad : 'rgba(255,255,255,0.12)',
                    border: isHov ? 'none' : `1.5px solid ${role.color}60`,
                    color: isHov ? '#fff' : 'rgba(255,255,255,0.88)',
                    transition: 'all 0.28s ease',
                    boxShadow: isHov ? `0 6px 24px ${role.glow}` : '0 2px 8px rgba(0,0,0,0.15)',
                    position: 'relative',
                  }}>
                    {role.icon}
                    {/* Pulse ring on hover */}
                    {isHov && (
                      <div style={{ position: 'absolute', inset: -3, borderRadius: 18, border: `1.5px solid ${role.color}55`, animation: 'iconRing 1s ease-out infinite', pointerEvents: 'none' }} />
                    )}
                  </div>

                  {/* Labels */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isHov ? role.colorAlt : '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: '0.16rem', fontFamily: "'Albert Sans',sans-serif", letterSpacing: '0.01em', transition: 'color 0.22s ease' }}>
                      {role.label}
                    </div>
                    <div style={{ color: isHov ? `${role.color}bb` : 'rgba(255,255,255,0.36)', fontSize: '0.73rem', fontFamily: "'Albert Sans',sans-serif", fontWeight: 500, transition: 'color 0.22s ease', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {role.desc}
                    </div>
                  </div>

                  {/* Chevron */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingRight: '0.25rem' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={isHov ? role.color : 'rgba(255,255,255,0.22)'} strokeWidth={2.5} style={{ width: 17, height: 17, transition: 'all 0.25s ease', transform: isHov ? 'translateX(4px)' : 'none' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.7rem 1.8rem', textAlign: 'center', background: 'rgba(0,0,0,0.12)' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.22)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Face-ID Attendance Management System · v1.0
          </p>
        </div>
      </div>

      {/* ── Slide dots ── */}
      <div style={{ position: 'absolute', bottom: '1.4rem', right: '1.6rem', zIndex: 20, display: 'flex', gap: '6px', alignItems: 'center' }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{ height: '5px', borderRadius: '99px', background: '#6FCF97', width: i === active ? '22px' : '5px', opacity: i === active ? 1 : 0.28, transition: 'all 0.4s ease' }} />
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        button { font-family: 'Albert Sans', sans-serif; cursor: pointer; }

        @keyframes shimmerBar {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes orbFloat1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(40px, 30px) scale(1.12); }
        }
        @keyframes orbFloat2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-35px, -40px) scale(1.18); }
        }
        @keyframes orbFloat3 {
          0%,100% { transform: translate(0,0); }
          40%     { transform: translate(-22px, 18px); }
          80%     { transform: translate(18px, -22px); }
        }
        @keyframes roleSlideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes iconRing {
          0%   { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.55); }
        }
        @keyframes cardGlow {
          0%,100% { box-shadow: 0 32px 100px rgba(0,0,0,0.75), 0 0 50px rgba(47,160,132,0.08); }
          50%     { box-shadow: 0 32px 100px rgba(0,0,0,0.75), 0 0 70px rgba(47,160,132,0.18); }
        }
        .orb { pointer-events: none; }
        .orb1 { animation: orbFloat1 11s ease-in-out infinite; }
        .orb2 { animation: orbFloat2 14s ease-in-out infinite; }
        .orb3 { animation: orbFloat3 17s ease-in-out infinite; }
        .mainCard { animation: cardGlow 7s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
