import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { LecturerLayout } from '@/components/layout/LecturerLayout'
import { useAuthStore } from '@/store/authStore'
import { getLecturerCourses } from '@/services/courseService'
import { getCourseAttendance, getEnrolledStudents } from '@/services/studentService'
import { Spinner } from '@/components/ui/Spinner'
import { normalizeLevel, levelFromCourseCode } from '@/utils'

export default function LecturerCoursesPage() {
  const { profile } = useAuthStore()
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    Promise.all([getLecturerCourses(profile.id), getEnrolledStudents()])
      .then(async ([c, s]) => {
        setCourses(c)
        setStudents(s)
        const statsMap = {}
        await Promise.all(c.map(async course => {
          const records = await getCourseAttendance(course.id)
          const cl = levelFromCourseCode(course.code) || normalizeLevel(course.level)
          const enrolled = s.filter(st => normalizeLevel(st.level) === normalizeLevel(cl)).length
          const presentCount = records.filter(r => r.status === 'present').length
          const totalRecords = records.length
          statsMap[course.id] = { presentCount, totalRecords, enrolled }
        }))
        setStats(statsMap)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <LecturerLayout>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner size={28} color="brand" />
      </div>
    </LecturerLayout>
  )

  return (
    <LecturerLayout>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <AnimatedLabel text="Courses" Icon={BookOpen} />
          </div>
          <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{profile?.name || 'Lecturer'}</h1>
        </div>

        {courses.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', padding: '3rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(31,111,95,0.07)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(47,160,132,0.08)', border: '1.5px solid rgba(47,160,132,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2FA084" strokeWidth="1.8" style={{ width: 26, height: 26 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>No courses assigned</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Contact your admin to be assigned to courses.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {courses.map(course => {
              const s = stats[course.id] || { presentCount: 0, totalRecords: 0, enrolled: 0 }
              const attendanceRate = s.enrolled > 0 ? Math.round((s.presentCount / Math.max(s.totalRecords, 1)) * 100) : 0
              const isOpen = expanded === course.id
              const cl2 = levelFromCourseCode(course.code) || normalizeLevel(course.level)
              const courseStudents = students.filter(st => normalizeLevel(st.level) === normalizeLevel(cl2))

              return (
                <div key={course.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(31,111,95,0.07)', overflow: 'hidden', transition: 'box-shadow 0.15s' }}>
                  {/* Course header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : course.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    {/* Color block */}
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(47,160,132,0.08)', border: '1.5px solid rgba(47,160,132,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2FA084" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{course.code}</span>
                        {course.level && (
                          <span style={{ padding: '0.18rem 0.55rem', borderRadius: 6, background: '#eff6ff', color: '#3b82f6', fontSize: '0.68rem', fontWeight: 700 }}>{course.level}</span>
                        )}
                      </div>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title || course.name || 'No title'}</p>
                    </div>
                    {/* Mini stats */}
                    <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2FA084' }}>{courseStudents.length}</p>
                        <p style={{ margin: 0, fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>Students</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: attendanceRate >= 75 ? '#16a34a' : attendanceRate >= 50 ? '#d97706' : '#dc2626' }}>{attendanceRate}%</p>
                        <p style={{ margin: 0, fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>Attendance</p>
                      </div>
                    </div>
                    {/* Chevron */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>

                  {/* Progress bar */}
                  <div style={{ height: 3, background: '#f1f5f9', margin: '0 1.25rem' }}>
                    <div style={{ height: '100%', width: `${attendanceRate}%`, background: attendanceRate >= 75 ? '#16a34a' : attendanceRate >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f8fafc', marginTop: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
                        {[
                          { label: 'Total Records', value: s.totalRecords },
                          { label: 'Present', value: s.presentCount, color: '#16a34a' },
                          { label: 'Absent', value: Math.max(0, s.totalRecords - s.presentCount), color: '#dc2626' },
                        ].map(stat => (
                          <div key={stat.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: stat.color || '#334155' }}>{stat.value}</p>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{stat.label}</p>
                          </div>
                        ))}
                      </div>
                      {course.units && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>Credit Units:</span> {course.units}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </LecturerLayout>
  )
}
