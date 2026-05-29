import { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, BellOff, FileText, Fingerprint, Bell } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { getAttendanceSummary, getMyAbsenceRequests, getMyReenrollRequests } from '@/services/studentService'
import { useAuthStore } from '@/store/authStore'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { AnimatedTitle } from '@/components/ui/AnimatedTitle'
import { Spinner } from '@/components/ui/Spinner'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const CARD = {
  background: '#fff',
  border: '1px solid #f1f5f9',
  borderRadius: 20,
  boxShadow: '0 2px 12px rgba(31,111,95,0.07)',
}

const ABSENCE_LABELS  = { sickness: 'Sickness / Medical', police: 'Police / Legal Matter', other: 'Other Emergency' }
const REENROLL_LABELS = { accident: 'Accident / Injury', surgery: 'Facial Surgery', weight: 'Significant Weight Change', other: 'Other Facial Change' }

const cfg = {
  danger:  { color: '#b91c1c', bg: '#fff1f2', border: '#b91c1c', Icon: AlertTriangle, iconColor: '#b91c1c' },
  warning: { color: '#92400e', bg: '#fffbeb', border: '#d97706', Icon: AlertTriangle, iconColor: '#d97706' },
  success: { color: '#166534', bg: '#f0fdf4', border: '#16a34a', Icon: CheckCircle,   iconColor: '#16a34a' },
  info:    { color: '#075985', bg: '#f0f9ff', border: '#0ea5e9', Icon: Bell,           iconColor: '#0284c7' },
}

const MIN_SESSIONS = 5

export default function StudentNotifications() {
  const { profile } = useAuthStore()
  const matric      = profile?.matric || sessionStorage.getItem('studentMatric')
  const firstName   = (profile?.name || sessionStorage.getItem('studentName') || 'Student').split(' ')[0]

  const [loading,       setLoading]       = useState(true)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!matric) return
    Promise.all([
      getAttendanceSummary(matric),
      getMyAbsenceRequests(matric),
      getMyReenrollRequests(matric),
    ]).then(([s, absReqs, reenrollReqs]) => {
      const items = []

      // ── Attendance notifications ──
      if (s && s.records?.length) {
        const courseMap = {}
        for (const rec of s.records) {
          const cid = rec.course_id || 'Unknown'
          if (!courseMap[cid]) courseMap[cid] = { total: 0, present: 0 }
          courseMap[cid].total++
          if (rec.status === 'present' || rec.present) courseMap[cid].present++
        }
        const overall       = s.percentage || 0
        const totalSessions = s.total      || 0

        if (totalSessions < MIN_SESSIONS) {
          items.push({
            id: 'semester-start',
            type: 'info',
            icon: 'alert',
            title: 'Attendance Tracking Active',
            body: `${totalSessions === 1 ? 'Your first class has been recorded.' : `${totalSessions} classes have been recorded so far.`} Your attendance is being tracked from the start of the semester. Eligibility for examinations requires a minimum of 75% attendance — attend every class consistently to build a strong record.`,
          })
        } else if (overall < 75) {
          items.push({
            id: 'overall',
            type: 'danger',
            icon: 'alert',
            title: 'Overall Attendance Below Threshold',
            body: `Your overall attendance is ${overall}%. You need ${75 - overall}% more to qualify for examinations. Attend upcoming classes consistently to reach the 75% requirement.`,
          })
        } else {
          items.push({
            id: 'overall-ok',
            type: 'warning',
            icon: 'alert',
            title: 'Keep Attending — Do Not Slow Down',
            body: `Your attendance is currently ${overall}%. The 75% minimum applies to every class recorded — your rate updates downward with every absence. Past attendance does not protect you from missing future classes. Show up to every session.`,
          })
        }

        for (const [cid, c] of Object.entries(courseMap)) {
          const pct = c.total > 0 ? Math.round(c.present / c.total * 100) : 0
          if (pct < 75) {
            const needed = Math.ceil((0.75 * c.total - c.present) / 0.25)
            items.push({
              id: `course-${cid}`,
              type: 'warning',
              icon: 'alert',
              title: `${cid} — At Risk`,
              body: `Current attendance: ${pct}% (${c.present}/${c.total} classes attended). Attend ${needed} more consecutive class${needed === 1 ? '' : 'es'} to reach the 75% threshold for this course.`,
            })
          }
        }
      }

      // ── Absence request outcomes ──
      for (const req of (absReqs || [])) {
        if (req.status === 'approved') {
          items.push({
            id: `absence-${req.id}`,
            type: 'success',
            icon: 'file',
            title: 'Absence Request Approved',
            body: `Your ${ABSENCE_LABELS[req.reason_type] || req.reason_type} absence request submitted on ${fmt(req.created_at)} has been approved.${req.admin_note ? ` Admin note: "${req.admin_note}"` : ''}`,
          })
        } else if (req.status === 'rejected') {
          items.push({
            id: `absence-${req.id}`,
            type: 'danger',
            icon: 'file',
            title: 'Absence Request Rejected',
            body: `Your ${ABSENCE_LABELS[req.reason_type] || req.reason_type} absence request submitted on ${fmt(req.created_at)} was not approved.${req.admin_note ? ` Reason: "${req.admin_note}"` : ' Contact the department for more information.'}`,
          })
        }
      }

      // ── Re-enrollment request outcomes ──
      for (const req of (reenrollReqs || [])) {
        if (req.status === 'approved') {
          items.push({
            id: `reenroll-${req.id}`,
            type: 'success',
            icon: 'fingerprint',
            title: 'Re-enrollment Request Approved',
            body: `Your re-enrollment request (${REENROLL_LABELS[req.reason] || req.reason}) has been approved. Visit the Re-enrollment page to register your biometrics again.${req.admin_note ? ` Admin note: "${req.admin_note}"` : ''}`,
          })
        } else if (req.status === 'rejected') {
          items.push({
            id: `reenroll-${req.id}`,
            type: 'danger',
            icon: 'fingerprint',
            title: 'Re-enrollment Request Rejected',
            body: `Your re-enrollment request (${REENROLL_LABELS[req.reason] || req.reason}) was not approved.${req.admin_note ? ` Reason: "${req.admin_note}"` : ' Contact the department for more information.'}`,
          })
        }
      }

      // Mark all seen — count matches the layout badge formula so badge clears on visit
      sessionStorage.setItem('notifSeen', String(items.length))
      setNotifications(items)
    }).finally(() => setLoading(false))
  }, [matric])

  function resolveIcon(n, DefaultIcon) {
    if (n.icon === 'file')        return FileText
    if (n.icon === 'fingerprint') return Fingerprint
    return DefaultIcon
  }

  return (
    <StudentLayout>
      <div style={{ marginBottom: '5.5rem' }}>
        <div style={{ marginBottom: '0.25rem' }}>
          <AnimatedLabel text="Notifications" Icon={Bell} />
        </div>
        <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          {(profile?.name || sessionStorage.getItem('studentName') || 'Student')}
        </h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
          <Spinner size={32} color="white" />
        </div>
      ) : !notifications.length ? (
        <div style={{ ...CARD, padding: '4rem 2rem', textAlign: 'center' }}>
          <BellOff size={40} color="#2FA084" strokeWidth={1.5} style={{ margin: '0 auto 1rem', opacity: 0.55 }} />
          <p style={{ color: '#040707', fontSize: '0.95rem', fontWeight: 700, margin: 0, fontFamily: "inherit" }}>No notifications</p>
          <p style={{ color: '#5B5B5B', fontSize: '0.82rem', margin: '0.4rem 0 0', fontFamily: "inherit" }}>
            You're all caught up. Attendance alerts and request updates will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {notifications.map(n => {
            const { color, bg, border, Icon: DefaultIcon, iconColor } = cfg[n.type]
            const Icon = resolveIcon(n, DefaultIcon)
            return (
              <div key={n.id} style={{ ...CARD, display: 'flex', gap: '1rem', padding: '1.2rem 1.4rem', borderLeft: `4px solid ${border}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color={iconColor} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color, fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.25rem', fontFamily: "inherit" }}>{n.title}</p>
                  <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: 0, fontFamily: "inherit", lineHeight: 1.55 }}>{n.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </StudentLayout>
  )
}
