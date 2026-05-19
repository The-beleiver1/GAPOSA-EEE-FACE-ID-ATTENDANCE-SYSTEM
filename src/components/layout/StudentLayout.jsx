import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Activity, CalendarX2, Fingerprint, LogOut, Menu, Bell, UserCircle, KeyRound, Mail, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { getAttendanceSummary, getMyAbsenceRequests, getMyReenrollRequests } from '@/services/studentService'
import { getInitials } from '@/utils'
import logo from '@/assets/gaposa-logo.png'

const NAV = [
  { to: '/student',               label: 'Overview',         Icon: LayoutDashboard, end: true  },
  { to: '/student/attendance',    label: 'My Attendance',    Icon: Activity,        end: false },
  { to: '/student/absence',       label: 'Absence Requests', Icon: CalendarX2,      end: false },
  { to: '/student/reenroll',      label: 'Re-enrollment',    Icon: Fingerprint,     end: false },
  { to: '/student/notifications', label: 'Notifications',    Icon: Bell,            end: false },
]

const PROFILE_CHILDREN = [
  { to: '/student/profile/pin',   label: 'Set PIN',              Icon: KeyRound },
  { to: '/student/profile/email', label: 'Email Notifications',  Icon: Mail     },
]

export function StudentLayout({ children }) {
  const { profile }  = useAuthStore()
  const navigate     = useNavigate()
  const location     = useLocation()
  const [open, setOpen] = useState(false)

  const isProfileRoute = location.pathname.startsWith('/student/profile')
  const [profileOpen, setProfileOpen] = useState(isProfileRoute)

  useEffect(() => {
    if (isProfileRoute) setProfileOpen(true)
  }, [isProfileRoute])

  const name   = profile?.name   || sessionStorage.getItem('studentName')  || 'Student'
  const matric = profile?.matric || sessionStorage.getItem('studentMatric') || ''

  const [photoUrl,    setPhotoUrl]    = useState(null)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [notifCount,  setNotifCount]  = useState(0)

  useEffect(() => {
    if (!matric) return
    supabase.from('students').select('photo_url').eq('matric', matric).single()
      .then(({ data }) => { if (data?.photo_url) setPhotoUrl(data.photo_url) })
  }, [matric])

  useEffect(() => {
    if (!matric) return
    Promise.all([
      getAttendanceSummary(matric),
      getMyAbsenceRequests(matric),
      getMyReenrollRequests(matric),
    ]).then(([s, absReqs, reenrollReqs]) => {
      let total = 0
      if (s && s.records?.length) {
        const courseMap = {}
        for (const rec of s.records) {
          const cid = rec.course_id || 'Unknown'
          if (!courseMap[cid]) courseMap[cid] = { total: 0, present: 0 }
          courseMap[cid].total++
          if (rec.status === 'present' || rec.present) courseMap[cid].present++
        }
        const atRiskCount = Object.values(courseMap).filter(c => c.total > 0 && Math.round(c.present / c.total * 100) < 75).length
        total += 1 + atRiskCount
      }
      total += (absReqs      || []).filter(r => r.status === 'approved' || r.status === 'rejected').length
      total += (reenrollReqs || []).filter(r => r.status === 'approved' || r.status === 'rejected').length
      const seen = parseInt(sessionStorage.getItem('notifSeen') || '0', 10)
      setNotifCount(Math.max(0, total - seen))
    })
  }, [matric])

  async function handleLogout() {
    await supabase.auth.signOut()
    sessionStorage.clear()
    navigate('/auth/student')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#EEEEEE', fontFamily: "'Geologica', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-40 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ width: 240, flexShrink: 0, background: '#1F6F5F', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Sidebar Header */}
        <div style={{ padding: '1rem 1.2rem 0.95rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Logo + Project Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.55rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fff', padding: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 3px 14px rgba(0,0,0,0.3)' }}>
              <img src={logo} alt="GAPOSA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontWeight: 900, fontSize: '1.05rem', lineHeight: 1.1, letterSpacing: '-0.01em' }}>EEE FACE-ID</p>
            </div>
          </div>
          {/* Institution + Panel label — unified, no dividers, no card */}
          <div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.74rem', lineHeight: 1.3 }}>Gateway ICT Polytechnic</p>
            <p style={{ margin: '0.12rem 0 0.28rem', color: 'rgba(111,207,151,0.78)', fontSize: '0.6rem', fontWeight: 500, lineHeight: 1.4 }}>Electrical / Electronics Engineering Dept.</p>
            <p style={{ margin: 0, color: '#6FCF97', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Student Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.85rem 0', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 0.4rem', padding: '0 1.35rem', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Navigation</p>
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.72rem',
                padding: '0.68rem 1.35rem',
                textDecoration: 'none',
                fontSize: '0.87rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.72)',
                borderLeft: isActive ? '3px solid #6FCF97' : '3px solid transparent',
                background: isActive ? 'rgba(111,207,151,0.13)' : 'transparent',
                transition: 'all 0.15s ease',
                position: 'relative',
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? '#6FCF97' : 'rgba(255,255,255,0.6)'} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {to === '/student/notifications' && notifCount > 0 && (
                    <span style={{ minWidth: 17, height: 17, borderRadius: 99, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#fff', padding: '0 4px' }}>
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Profile accordion */}
          <button
            onClick={() => { navigate('/student/profile'); setProfileOpen(true); setOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.72rem',
              padding: '0.68rem 1.35rem', width: '100%', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.87rem',
              fontWeight: isProfileRoute ? 700 : 500,
              color: isProfileRoute ? '#fff' : 'rgba(255,255,255,0.72)',
              borderLeft: isProfileRoute ? '3px solid #6FCF97' : '3px solid transparent',
              background: isProfileRoute ? 'rgba(111,207,151,0.13)' : 'transparent',
              transition: 'all 0.15s ease',
              textAlign: 'left',
            }}>
            <UserCircle size={16} strokeWidth={isProfileRoute ? 2.2 : 1.8} color={isProfileRoute ? '#6FCF97' : 'rgba(255,255,255,0.6)'} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>My Profile</span>
            <ChevronDown size={13} color="rgba(255,255,255,0.45)"
              style={{ flexShrink: 0, transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>

          {/* Profile sub-items */}
          {profileOpen && (
            <div style={{ overflow: 'hidden' }}>
              {PROFILE_CHILDREN.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} onClick={() => setOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.55rem 1.35rem 0.55rem 2.85rem',
                    textDecoration: 'none',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.52)',
                    borderLeft: isActive ? '3px solid #a5b4fc' : '3px solid transparent',
                    background: isActive ? 'rgba(165,180,252,0.1)' : 'transparent',
                    transition: 'all 0.15s ease',
                  })}>
                  {({ isActive }) => (
                    <>
                      <Icon size={13} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? '#a5b4fc' : 'rgba(255,255,255,0.4)'} style={{ flexShrink: 0 }} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '0.9rem 1.35rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.7rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
            {photoUrl && !photoFailed ? (
              <img src={photoUrl} alt={name} onError={() => setPhotoFailed(true)}
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(111,207,151,0.55)' }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(111,207,151,0.18)', border: '1.5px solid rgba(111,207,151,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#6FCF97', flexShrink: 0 }}>
                {getInitials(name)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.32)', fontSize: '0.6rem', fontWeight: 500 }}>{matric || 'Student'}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', padding: '0.55rem 0.7rem', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', fontSize: '0.83rem', fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.background = 'transparent' }}>
            <LogOut size={14} style={{ flexShrink: 0 }} /> Sign Out
          </button>
        </div>
      </aside>

      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.4)' }} onClick={() => setOpen(false)} />}

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <header className="flex lg:hidden" style={{ alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', background: '#1F6F5F', flexShrink: 0 }}>
          <button onClick={() => setOpen(true)} style={{ padding: 7, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <Menu size={18} />
          </button>
          <img src={logo} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>EEE FACE-ID</span>
        </header>
        <main className="main-content">
          <div style={{ maxWidth: 940, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; font-family: 'Geologica', system-ui, sans-serif; }
        input, textarea, select, button { font-family: 'Geologica', system-ui, sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 99px; }
      `}</style>
    </div>
  )
}
