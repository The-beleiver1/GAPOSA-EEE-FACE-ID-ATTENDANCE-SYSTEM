import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, Settings, LogOut,
  Menu, Bell, Moon, Sun, Layers, ShieldCheck, ClipboardList, TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { signOut } from '@/services/authService'
import { useAutoLogout } from '@/hooks/useAutoLogout'
import { useToast } from '@/components/ui/Toast'
import { getInitials } from '@/utils'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import logo from '@/assets/gaposa-logo.png'

const NAV = [
  { to: '/admin',              label: 'Dashboard',   Icon: LayoutDashboard, end: true  },
  { to: '/admin/students',     label: 'Students',    Icon: Users,           end: false },
  { to: '/admin/masterlist',   label: 'Master List', Icon: BookOpen,        end: false },
  { to: '/admin/courses',      label: 'Courses',     Icon: Layers,          end: false },
  { to: '/admin/lecturers',    label: 'Lecturers',   Icon: GraduationCap,   end: false },
  { to: '/admin/eligibility',  label: 'Eligibility', Icon: ShieldCheck,     end: false },
  { to: '/admin/hod',          label: 'HOD Report',  Icon: TrendingUp,      end: false },
  { to: '/admin/audit',        label: 'Audit Log',   Icon: ClipboardList,   end: false },
  { to: '/admin/settings',     label: 'Settings',    Icon: Settings,        end: false },
]

export function AdminLayout({ children }) {
  const { profile, logout } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { dark, toggle: toggleTheme } = useTheme()
  const [open, setOpen]             = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  useAutoLogout()

  useEffect(() => {
    async function fetchPending() {
      const [{ count: lCount }, { count: rCount }, { count: aCount }] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'lecturer').eq('status', 'pending'),
        supabase.from('reenroll_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('absence_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setPendingCount((lCount || 0) + (rCount || 0) + (aCount || 0))
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleLogout() {
    await signOut()
    logout()
    navigate('/')
    toast('Logged out successfully', 'success')
  }

  return (
    <div className="layout-root" style={{ display: 'flex', overflow: 'hidden', background: '#EEEEEE', fontFamily: "'Geologica', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className={`sidebar-aside fixed lg:relative inset-y-0 left-0 z-40 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
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
            <p style={{ margin: 0, color: '#6FCF97', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Admin Panel</p>
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

          {/* Notifications — with live badge */}
          <NavLink to="/admin/notifications" onClick={() => setOpen(false)}
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
                <Bell size={16} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? '#6FCF97' : 'rgba(255,255,255,0.62)'} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Notifications</span>
                {pendingCount > 0 && (
                  <span style={{ minWidth: 17, height: 17, borderRadius: 99, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: '#fff', padding: '0 4px' }}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '0.9rem 1.35rem', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.7rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(111,207,151,0.18)', border: '1.5px solid rgba(111,207,151,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#6FCF97', flexShrink: 0 }}>
              {getInitials(profile?.name || 'Admin')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || 'Admin User'}</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.32)', fontSize: '0.6rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleLogout}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.7rem', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', fontSize: '0.83rem', fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.background = 'transparent' }}>
              <LogOut size={14} style={{ flexShrink: 0 }} /> Logout
            </button>
            <button onClick={toggleTheme} title={dark ? 'Switch to light' : 'Switch to dark'}
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
            <span style={{ color: '#6FCF97', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.05em' }}>ADMIN</span>
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button onClick={toggleTheme} style={{ padding: 7, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} style={{ padding: 7, borderRadius: 8, background: 'rgba(239,68,68,0.18)', border: 'none', cursor: 'pointer', color: '#fca5a5', display: 'flex', alignItems: 'center' }}>
              <LogOut size={16} />
            </button>
          </div>
        </header>
        {/* Desktop top-right action bar */}
        <div className="hidden lg:flex" style={{ justifyContent: 'flex-end', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
          <button onClick={toggleTheme} title={dark ? 'Light mode' : 'Dark mode'} style={{ padding: '6px 8px', borderRadius: 8, background: 'transparent', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '6px 12px', borderRadius: 8, background: 'transparent', border: '1px solid #fecaca', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s' }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
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
          { to: '/admin',                label: 'Dashboard',   Icon: LayoutDashboard, end: true  },
          { to: '/admin/students',       label: 'Students',    Icon: Users,           end: false },
          { to: '/admin/lecturers',      label: 'Lecturers',   Icon: GraduationCap,   end: false },
          { to: '/admin/notifications',  label: 'Alerts',      Icon: Bell,            end: false },
          { to: '/admin/settings',       label: 'Settings',    Icon: Settings,        end: false },
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
                <div style={{ position: 'relative' }}>
                  <Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} />
                  {to === '/admin/notifications' && pendingCount > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -6, minWidth: 14, height: 14, borderRadius: 99, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800, color: '#fff', padding: '0 3px' }}>
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
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
