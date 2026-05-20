import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Scan, CalendarCheck, Users, BookOpen, BarChart3, CircleUser, LogOut, Menu, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { signOut } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import { getInitials } from '@/utils'
import { useTheme } from '@/contexts/ThemeContext'
import logo from '@/assets/gaposa-logo.png'

const NAV = [
  { to: '/lecturer',            label: 'Scan',       Icon: Scan,          end: true  },
  { to: '/lecturer/attendance', label: 'Attendance', Icon: CalendarCheck, end: false },
  { to: '/lecturer/students',   label: 'Students',   Icon: Users,         end: false },
  { to: '/lecturer/courses',    label: 'My Courses', Icon: BookOpen,      end: false },
  { to: '/lecturer/reports',    label: 'Reports',    Icon: BarChart3,     end: false },
  { to: '/lecturer/profile',    label: 'Profile',    Icon: CircleUser,    end: false },
]

export function LecturerLayout({ children }) {
  const { profile, logout } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { dark, toggle: toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await signOut(); logout(); navigate('/'); toast('Logged out', 'success')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#EEEEEE', fontFamily: "'Geologica', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-40 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ width: 236, flexShrink: 0, background: '#1F6F5F', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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
            <p style={{ margin: 0, color: '#6FCF97', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Lecturer Panel</p>
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
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? '#6FCF97' : 'rgba(255,255,255,0.62)'} style={{ flexShrink: 0 }} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '0.9rem 1.35rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.7rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(111,207,151,0.18)', border: '1.5px solid rgba(111,207,151,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#6FCF97', flexShrink: 0 }}>
              {getInitials(profile?.name || 'L')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name}</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.32)', fontSize: '0.6rem', fontWeight: 500 }}>Lecturer</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleLogout}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.7rem', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', fontSize: '0.83rem', fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.background = 'transparent' }}>
              <LogOut size={14} style={{ flexShrink: 0 }} /> Sign Out
            </button>
            <button onClick={toggleTheme} title={dark ? 'Light mode' : 'Dark mode'}
              style={{ padding: '0.55rem 0.7rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}>
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>EEE FACE-ID</span>
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.85rem', lineHeight: 1 }}>|</span>
            <span style={{ color: '#6FCF97', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.05em' }}>LECTURER</span>
          </span>
          <button onClick={toggleTheme} style={{ marginLeft: 'auto', padding: 7, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>
        <main className="main-content">
          <div style={{ maxWidth: 940, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="flex lg:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#1F6F5F', borderTop: '1px solid rgba(255,255,255,0.12)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {[
          { to: '/lecturer',            label: 'Scan',       Icon: Scan,          end: true  },
          { to: '/lecturer/attendance', label: 'Attendance', Icon: CalendarCheck, end: false },
          { to: '/lecturer/students',   label: 'Students',   Icon: Users,         end: false },
          { to: '/lecturer/courses',    label: 'Courses',    Icon: BookOpen,      end: false },
          { to: '/lecturer/profile',    label: 'Profile',    Icon: CircleUser,    end: false },
        ].map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            style={({ isActive }) => ({
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '0.55rem 0 0.5rem',
              textDecoration: 'none', gap: '0.2rem',
              color: isActive ? '#6FCF97' : 'rgba(255,255,255,0.5)',
              borderTop: isActive ? '2px solid #6FCF97' : '2px solid transparent',
              fontSize: '0.58rem', fontWeight: isActive ? 700 : 500,
              transition: 'color 0.15s',
            })}>
            {({ isActive }) => (
              <>
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

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
