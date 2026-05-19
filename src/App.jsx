import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { ToastProvider } from '@/components/ui/Toast'
import LoadingScreen from '@/pages/auth/LoadingScreen'

// ── Lazy-loaded pages ────────────────────────────────────────────────
// Auth & enrollment (small, load immediately-ish)
const LandingPage         = lazy(() => import('@/pages/auth/LandingPage'))
const LecturerAuth        = lazy(() => import('@/pages/auth/LecturerAuth'))
const AdminAuth           = lazy(() => import('@/pages/auth/AdminAuth'))
const StudentAuth         = lazy(() => import('@/pages/auth/StudentAuth'))

// Enrollment flow (same file, named exports)
const EnrollStep1         = lazy(() => import('@/pages/student/EnrollFlow').then(m => ({ default: m.EnrollStep1 })))
const EnrollVerify        = lazy(() => import('@/pages/student/EnrollFlow').then(m => ({ default: m.EnrollVerify })))
const EnrollInstructions  = lazy(() => import('@/pages/student/EnrollFlow').then(m => ({ default: m.EnrollInstructions })))
const EnrollCamera        = lazy(() => import('@/pages/student/EnrollFlow').then(m => ({ default: m.EnrollCamera })))
const EnrollSuccess       = lazy(() => import('@/pages/student/EnrollFlow').then(m => ({ default: m.EnrollSuccess })))
const EnrollFailed        = lazy(() => import('@/pages/student/EnrollFlow').then(m => ({ default: m.EnrollFailed })))

// Student portal
const StudentDashboard    = lazy(() => import('@/pages/student/StudentDashboard'))
const StudentAttendance   = lazy(() => import('@/pages/student/StudentAttendance'))
const StudentAbsence      = lazy(() => import('@/pages/student/StudentAbsence'))
const StudentReenroll     = lazy(() => import('@/pages/student/StudentReenroll'))
const StudentNotifications = lazy(() => import('@/pages/student/StudentNotifications'))
const StudentProfile      = lazy(() => import('@/pages/student/StudentProfile'))
const StudentPinPage      = lazy(() => import('@/pages/student/StudentPinPage'))
const StudentEmailPage    = lazy(() => import('@/pages/student/StudentEmailPage'))

// Lecturer portal
const ScanPage            = lazy(() => import('@/pages/lecturer/ScanPage'))
const AttendancePage      = lazy(() => import('@/pages/lecturer/AttendancePage'))
const LecturerStudentsPage = lazy(() => import('@/pages/lecturer/LecturerStudentsPage'))
const LecturerCoursesPage = lazy(() => import('@/pages/lecturer/LecturerCoursesPage'))
const LecturerReportsPage = lazy(() => import('@/pages/lecturer/LecturerReportsPage'))
const LecturerProfilePage = lazy(() => import('@/pages/lecturer/LecturerProfilePage'))

// Admin portal
const AdminDashboard      = lazy(() => import('@/pages/admin/AdminDashboard'))
const StudentsPage        = lazy(() => import('@/pages/admin/StudentsPage'))
const MasterListPage      = lazy(() => import('@/pages/admin/MasterListPage'))
const LecturersPage       = lazy(() => import('@/pages/admin/LecturersPage'))
const SettingsPage        = lazy(() => import('@/pages/admin/SettingsPage'))
const NotificationsPage   = lazy(() => import('@/pages/admin/NotificationsPage'))

// ── Route guards ─────────────────────────────────────────────────────

function RequireRole({ role, children }) {
  const { role: userRole, loading } = useAuth()
  if (loading) return null
  if (!userRole) return <Navigate to="/" replace />
  if (userRole !== role) return <Navigate to="/" replace />
  return children
}

// Checks a real Supabase anonymous session (set during student login)
function RequireStudent({ children }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isStudentSession = session?.user?.is_anonymous && session.user.user_metadata?.matric
      if (isStudentSession) {
        // Keep sessionStorage in sync for UI reads
        sessionStorage.setItem('studentMatric', session.user.user_metadata.matric)
        sessionStorage.setItem('studentName', session.user.user_metadata.name || 'Student')
        setStatus('ok')
      } else {
        setStatus('denied')
      }
    })

    // React to session changes (expiry, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isStudentSession = session?.user?.is_anonymous && session.user.user_metadata?.matric
      setStatus(isStudentSession ? 'ok' : 'denied')
    })
    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') return null
  if (status === 'denied') return <Navigate to="/auth/student" replace />
  return children
}

// ── Splash screen steps ───────────────────────────────────────────────
const STEPS = [
  { pct: 12,  msg: 'Connecting to database…' },
  { pct: 28,  msg: 'Establishing secure connection…' },
  { pct: 44,  msg: 'Loading face detection model…' },
  { pct: 60,  msg: 'Preparing recognition engine…' },
  { pct: 73,  msg: 'Checking authentication…' },
  { pct: 85,  msg: 'Verifying session…' },
  { pct: 93,  msg: 'Loading student data…' },
  { pct: 98,  msg: 'Almost ready…' },
]

export default function App() {
  useAuth()
  const [showApp,  setShowApp]  = useState(false)
  const [fading,   setFading]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [message,  setMessage]  = useState('Connecting to database…')

  useEffect(() => {
    let i = 0
    const iv = setInterval(() => {
      if (i >= STEPS.length) { clearInterval(iv); return }
      setProgress(STEPS[i].pct)
      setMessage(STEPS[i].msg)
      i++
    }, 5500 / STEPS.length)

    const done = setTimeout(() => {
      clearInterval(iv)
      setProgress(100)
      setMessage('Ready!')
      setTimeout(() => {
        setFading(true)
        setTimeout(() => { setFading(false); setShowApp(true) }, 700)
      }, 400)
    }, 5500)

    return () => { clearInterval(iv); clearTimeout(done) }
  }, [])

  return (
    <ToastProvider>
      {!showApp && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, opacity:fading?0:1, transition:fading?'opacity 0.7s ease':'none', pointerEvents:fading?'none':'auto' }}>
          <LoadingScreen progress={progress} message={message} />
        </div>
      )}
      {showApp && (
        <Suspense fallback={null}>
          <Routes>
            {/* Public */}
            <Route path="/"                         element={<LandingPage />} />
            <Route path="/auth/lecturer"            element={<LecturerAuth />} />
            <Route path="/auth/admin"               element={<AdminAuth />} />
            <Route path="/auth/student"             element={<StudentAuth />} />

            {/* Enrollment flow */}
            <Route path="/auth/enroll"              element={<EnrollStep1 />} />
            <Route path="/auth/enroll-verify"       element={<EnrollVerify />} />
            <Route path="/auth/enroll-instructions" element={<EnrollInstructions />} />
            <Route path="/auth/enrollment"          element={<EnrollCamera />} />
            <Route path="/auth/enroll-success"      element={<EnrollSuccess />} />
            <Route path="/auth/enroll-failed"       element={<EnrollFailed />} />

            {/* Student — guarded by Supabase anonymous session */}
            <Route path="/student"                  element={<RequireStudent><StudentDashboard /></RequireStudent>} />
            <Route path="/student/attendance"       element={<RequireStudent><StudentAttendance /></RequireStudent>} />
            <Route path="/student/absence"          element={<RequireStudent><StudentAbsence /></RequireStudent>} />
            <Route path="/student/reenroll"         element={<RequireStudent><StudentReenroll /></RequireStudent>} />
            <Route path="/student/notifications"    element={<RequireStudent><StudentNotifications /></RequireStudent>} />
            <Route path="/student/profile"          element={<RequireStudent><StudentProfile /></RequireStudent>} />
            <Route path="/student/profile/pin"      element={<RequireStudent><StudentPinPage /></RequireStudent>} />
            <Route path="/student/profile/email"    element={<RequireStudent><StudentEmailPage /></RequireStudent>} />

            {/* Lecturer — guarded by Supabase Auth role */}
            <Route path="/lecturer"                 element={<RequireRole role="lecturer"><ScanPage /></RequireRole>} />
            <Route path="/lecturer/attendance"      element={<RequireRole role="lecturer"><AttendancePage /></RequireRole>} />
            <Route path="/lecturer/students"        element={<RequireRole role="lecturer"><LecturerStudentsPage /></RequireRole>} />
            <Route path="/lecturer/courses"         element={<RequireRole role="lecturer"><LecturerCoursesPage /></RequireRole>} />
            <Route path="/lecturer/reports"         element={<RequireRole role="lecturer"><LecturerReportsPage /></RequireRole>} />
            <Route path="/lecturer/profile"         element={<RequireRole role="lecturer"><LecturerProfilePage /></RequireRole>} />

            {/* Admin — guarded by Supabase Auth role */}
            <Route path="/admin"                    element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
            <Route path="/admin/students"           element={<RequireRole role="admin"><StudentsPage /></RequireRole>} />
            <Route path="/admin/masterlist"         element={<RequireRole role="admin"><MasterListPage /></RequireRole>} />
            <Route path="/admin/lecturers"          element={<RequireRole role="admin"><LecturersPage /></RequireRole>} />
            <Route path="/admin/settings"           element={<RequireRole role="admin"><SettingsPage /></RequireRole>} />
            <Route path="/admin/notifications"      element={<RequireRole role="admin"><NotificationsPage /></RequireRole>} />

            {/* Catch all */}
            <Route path="*"                         element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      )}
    </ToastProvider>
  )
}
