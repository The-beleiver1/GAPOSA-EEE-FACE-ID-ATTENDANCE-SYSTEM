import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LecturerLayout } from '@/components/layout/LecturerLayout'
import { useAuthStore } from '@/store/authStore'
import { useScanStore } from '@/store/scanStore'
import { useCamera } from '@/hooks/useCamera'
import { useToast } from '@/components/ui/Toast'
import { captureFrameAsBase64, getEmbeddingsFromServer, checkFaceServer } from '@/services/faceService'
import { getAllEnrolledStudents, markAttendance, matchFaceInDatabase, getStudentsWithVerifiedEmail, queueAttendanceNotifications, dispatchTelegramNotifications } from '@/services/studentService'
import { getLecturerCourses, getSettings } from '@/services/courseService'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmModal } from '@/components/ui/Modal'
/* ── Animated sliding mode toggle ── */
function ModeToggle({ mode, onChange }) {
  const isMulti = mode === 'multiple'
  return (
    <div style={{ position:'relative', display:'flex', background:'#f1f5f9', borderRadius:99, padding:3 }}>
      <div style={{
        position:'absolute', top:3, bottom:3,
        left: isMulti ? 'calc(50% + 1.5px)' : 3,
        width:'calc(50% - 4.5px)',
        background:'#2FA084', borderRadius:99,
        transition:'left 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow:'0 2px 8px rgba(47,160,132,0.35)',
      }}/>
      {[
        { value:'single',   label:'Single Face' },
        { value:'multiple', label:'Continuous'  },
      ].map(({ value, label }) => (
        <button key={value} onClick={() => onChange(value)}
          style={{ flex:1, position:'relative', zIndex:1, padding:'0.42rem 0.5rem', border:'none', background:'transparent', color: mode===value ? '#fff' : '#94a3b8', fontWeight:700, fontSize:'0.72rem', cursor:'pointer', fontFamily:'inherit', transition:'color 0.25s', borderRadius:99 }}>
          {label}
        </button>
      ))}
    </div>
  )
}

/* ── Corner-bracket face guide ── */
function FaceGuide({ scanning }) {
  const c   = scanning ? '#6FCF97' : '#2FA084'
  const glow = scanning ? 'rgba(111,207,151,0.7)' : 'rgba(47,160,132,0.6)'
  const W = 240, H = 290, R = 18, L = 48
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
      {/* Dim overlay outside bracket */}
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.18)' }}/>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none"
        style={{ position:'relative', filter:`drop-shadow(0 0 10px ${glow}) drop-shadow(0 0 3px ${glow})`, transition:'filter 0.35s' }}>
        {/* Top-left */}
        <path d={`M ${L} 0 Q 0 0 0 ${L}`} stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
        {/* Top-right */}
        <path d={`M ${W-L} 0 Q ${W} 0 ${W} ${L}`} stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
        {/* Bottom-left */}
        <path d={`M 0 ${H-L} Q 0 ${H} ${L} ${H}`} stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
        {/* Bottom-right */}
        <path d={`M ${W-L} ${H} Q ${W} ${H} ${W} ${H-L}`} stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
        {/* Centre dot */}
        <circle cx={W/2} cy={H/2} r="3" fill={c} opacity="0.6"/>
        {/* Horizontal centre guide lines */}
        <line x1={W/2-18} y1={H/2} x2={W/2-8} y2={H/2} stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
        <line x1={W/2+8}  y1={H/2} x2={W/2+18} y2={H/2} stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
        <line x1={W/2} y1={H/2-18} x2={W/2} y2={H/2-8} stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
        <line x1={W/2} y1={H/2+8}  x2={W/2} y2={H/2+18} stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      </svg>
    </div>
  )
}

export default function ScanPage() {
  const navigate     = useNavigate()
  const { profile }  = useAuthStore()
  const scan         = useScanStore()
  const { videoRef, active, error: camError, startCamera, stopCamera, switchCamera } = useCamera()
  const { toast }    = useToast()

  const [courses,      setCourses]      = useState([])
  const [students,     setStudents]     = useState([])
  const [settings,     setSettings]     = useState({})
  const [loading,      setLoading]      = useState(true)
  const [showFinalise,  setShowFinalise]  = useState(false)
  const [finalising,    setFinalising]    = useState(false)
  const [finaliseResult, setFinaliseResult] = useState(null) // { present, absent, course, week } after success

  const scanIntervalRef        = useRef(null)
  const processingRef          = useRef(false)
  const serverErrCountRef      = useRef(0)
  const autoTimerRef           = useRef({})
  const alreadyMarkedTimerRef  = useRef(null)
  const wrongLevelTimerRef     = useRef(null)
  const [serverOnline,         setServerOnline]    = useState(null)
  const [scanStatus,           setScanStatus]      = useState('idle')
  const [alreadyMarked,        setAlreadyMarked]   = useState(null)
  const [wrongLevelStudent,    setWrongLevelStudent] = useState(null)
  const [manualMatric,         setManualMatric]    = useState('')
  const [manualMarking,        setManualMarking]   = useState(false)

  useEffect(() => {
    init()
    return () => { clearInterval(scanIntervalRef.current); stopCamera() }
  }, [])

  async function init() {
    setLoading(true)
    try {
      const [c, s, cfg] = await Promise.all([
        getLecturerCourses(profile.id),
        getAllEnrolledStudents(),
        getSettings(),
      ])
      setCourses(c); setStudents(s); setSettings(cfg)
      if (c.length) scan.setActiveCourse(c[0])
      if (!scan.activeWeek) scan.setActiveWeek(1)
      scan.setSession(cfg.session   || '2024/2025')
      scan.setSemester(cfg.semester || 'Second Semester')
      // Check server in background — non-blocking
      checkFaceServer().then(ok => setServerOnline(ok))
    } catch { toast('Failed to load data', 'error') }
    finally  { setLoading(false) }
  }

  async function handleStartCamera() {
    if (!scan.activeCourse) return toast('Select a course first', 'error')
    const ok = await checkFaceServer()
    setServerOnline(ok)
    if (!ok) return
    await startCamera('user')
    scan.setCameraActive(true)
    scanIntervalRef.current = setInterval(runScan, 1500)
  }

  function handleStopCamera() {
    clearInterval(scanIntervalRef.current)
    clearTimeout(alreadyMarkedTimerRef.current)
    clearTimeout(wrongLevelTimerRef.current)
    stopCamera(); scan.setCameraActive(false); scan.setScanning(false)
    setScanStatus('idle'); setAlreadyMarked(null); setWrongLevelStudent(null)
  }

  async function runScan() {
    // Use videoRef.current?.srcObject instead of the `active` state variable —
    // setInterval captures a stale closure where `active` is still false.
    // videoRef is a ref so its .current is always current.
    if (processingRef.current || !videoRef.current?.srcObject) return

    // Read fresh Zustand state — avoids stale closures on store values
    const store = useScanStore.getState()
    if (store.scanMode === 'single' && store.pendingApproval) return

    processingRef.current = true
    setScanStatus('detecting')

    try {
      // Step 1 — capture frame and get ArcFace embedding from Python server
      const frame = captureFrameAsBase64(videoRef.current)
      let embedding
      try {
        const results = await getEmbeddingsFromServer([frame])
        embedding = results?.[0]
        serverErrCountRef.current = 0  // reset on success
      } catch {
        serverErrCountRef.current++
        if (serverErrCountRef.current >= 3) {
          setServerOnline(false)
        }
        setScanStatus('idle')
        return
      }

      // null embedding = Python server found no face in the frame
      if (!embedding) { setScanStatus('no_face'); return }

      setServerOnline(true)
      store.setScanning(true)
      setScanStatus('matching')

      // Step 2 — match against Supabase pgvector
      const result = await matchFaceInDatabase(embedding)
      if (!result) { store.setScanning(false); setScanStatus('no_match'); return }

      // Already marked — show feedback card for 3 s then resume scanning
      if (store.isAlreadyScanned(result.student.matric)) {
        store.setScanning(false)
        setScanStatus('already_marked')
        setAlreadyMarked(result)
        clearTimeout(alreadyMarkedTimerRef.current)
        alreadyMarkedTimerRef.current = setTimeout(() => {
          setScanStatus('idle'); setAlreadyMarked(null)
        }, 3000)
        return
      }

      // Level / class validation
      const courseLevel = store.activeCourse?.level
      if (courseLevel && result.student.level && result.student.level !== courseLevel) {
        store.setScanning(false)
        setScanStatus('wrong_level')
        setWrongLevelStudent({ result, courseLevel })
        clearTimeout(wrongLevelTimerRef.current)
        if (store.scanMode === 'multiple') {
          // Auto-dismiss in continuous mode after 4 s
          wrongLevelTimerRef.current = setTimeout(() => {
            setScanStatus('idle'); setWrongLevelStudent(null)
          }, 4000)
        }
        return
      }

      store.setLastDetection(result)
      setScanStatus('found')

      if (store.scanMode === 'single') {
        store.setPendingApproval({ ...result, detectedAt: new Date() })
      } else {
        const { matric } = result.student
        const now = Date.now()
        if ((autoTimerRef.current[matric] || 0) + 6000 > now) {
          store.setScanning(false); setScanStatus('idle'); return
        }
        autoTimerRef.current[matric] = now
        await handleAutoAccept(result)
        store.setScanning(false); setScanStatus('idle')
      }
    } catch { useScanStore.getState().setScanning(false); setScanStatus('idle') }
    finally { processingRef.current = false }
  }

  async function handleAutoAccept({ student, confidence }) {
    // Use getState() to get fresh store values — this runs inside an async callback
    const store = useScanStore.getState()
    try {
      await markAttendance({
        matric: student.matric, name: student.name,
        courseId: store.activeCourse?.id, week: store.activeWeek,
        status: 'present', confidence,
        lecturerId: profile.id, semester: store.semester, session: store.session,
      })
      store.markPresent(student)
      toast(`✓ ${student.name} — present`, 'success')
    } catch { toast('Failed to save attendance', 'error') }
  }

  function handleDismissWrongLevel() {
    clearTimeout(wrongLevelTimerRef.current)
    setScanStatus('idle'); setWrongLevelStudent(null)
  }

  async function handleForceAccept() {
    if (!wrongLevelStudent) return
    const { result } = wrongLevelStudent
    const { student, confidence } = result
    clearTimeout(wrongLevelTimerRef.current)
    try {
      await markAttendance({
        matric: student.matric, name: student.name,
        courseId: scan.activeCourse?.id, week: scan.activeWeek,
        status: 'present', confidence,
        lecturerId: profile.id, semester: scan.semester, session: scan.session,
      })
      scan.markPresent(student)
      toast(`${student.name} (${student.level}) — force accepted`, 'success')
    } catch { toast('Failed to save', 'error') }
    finally { setScanStatus('idle'); setWrongLevelStudent(null) }
  }

  async function handleAccept() {
    if (!scan.pendingApproval) return
    const { student, confidence } = scan.pendingApproval
    try {
      await markAttendance({
        matric: student.matric, name: student.name,
        courseId: scan.activeCourse?.id, week: scan.activeWeek,
        status: 'present', confidence,
        lecturerId: profile.id, semester: scan.semester, session: scan.session,
      })
      scan.markPresent(student)
      toast(`${student.name} — present`, 'success')
    } catch { toast('Failed to save', 'error') }
    finally { scan.setPendingApproval(null); scan.setScanning(false) }
  }

  function handleReject() {
    scan.setPendingApproval(null); scan.setScanning(false)
  }

  async function handleFinalise() {
    setFinalising(true)
    try {
      const courseStudents = students.filter(s => s.level === scan.activeCourse?.level)
      const absent = courseStudents.filter(s => !scan.isAlreadyScanned(s.matric))
      const presentCount = scan.presentList.length
      const course = scan.activeCourse
      const week = scan.activeWeek
      for (const s of absent) {
        await markAttendance({
          matric: s.matric, name: s.name,
          courseId: course?.id, week,
          status: 'absent', confidence: 0,
          lecturerId: profile.id, semester: scan.semester, session: scan.session,
        })
        scan.markAbsent(s)
      }
      // Capture lists before resetting the session store
      const presentStudents = scan.presentList.map(s => ({ ...s, status: 'Present' }))
      const absentStudents  = absent.map(s => ({ ...s, status: 'Absent' }))
      scan.resetSession(); handleStopCamera()
      setFinaliseResult({ present: presentCount, absent: absent.length, course, week })
      // Fire-and-forget email notifications — never blocks the UI
      dispatchAttendanceEmails(presentStudents, absentStudents, course, week).catch(() => {})
    } catch { toast('Failed to finalise', 'error') }
    finally { setFinalising(false); setShowFinalise(false) }
  }

  async function handleManualMark(status) {
    const m = manualMatric.trim().toUpperCase()
    if (!m) return
    if (!scan.activeCourse) { toast('Select a course first', 'error'); return }
    const student = students.find(s => s.matric.toUpperCase() === m)
    if (!student) { toast(`Matric ${m} not found in enrolled students`, 'error'); return }
    if (scan.isAlreadyScanned(student.matric)) { toast(`${student.name} already marked`, 'error'); return }
    setManualMarking(true)
    try {
      await markAttendance({
        matric: student.matric, name: student.name,
        courseId: scan.activeCourse.id, week: scan.activeWeek,
        status, confidence: 0,
        lecturerId: profile.id, semester: scan.semester, session: scan.session,
      })
      status === 'present' ? scan.markPresent(student) : scan.markAbsent(student)
      toast(`${student.name} marked ${status} (manual)`, 'success')
      setManualMatric('')
    } catch { toast('Failed to save attendance', 'error') }
    finally { setManualMarking(false) }
  }

  async function dispatchAttendanceEmails(presentList, absentList, course, week) {
    const all = [...presentList, ...absentList]
    if (!all.length) return

    // Email — only for students with a verified email address
    const emailRecords = await getStudentsWithVerifiedEmail(all.map(s => s.matric))
    if (emailRecords.length) {
      const emailMap = Object.fromEntries(emailRecords.map(r => [r.matric, r.email]))
      const toQueue  = all
        .filter(s => emailMap[s.matric])
        .map(s => ({ matric: s.matric, name: s.name, email: emailMap[s.matric], status: s.status }))
      await queueAttendanceNotifications(toQueue, course, week)
    }

    // Telegram — for students who have linked their account
    await dispatchTelegramNotifications(presentList, absentList, course, week, scan.semester, scan.session)
  }

  const totalWeeks = settings.total_weeks || settings.totalWeeks || 15
  const present = scan.presentList.length
  const absent  = scan.absentList.length

  if (loading) return (
    <LecturerLayout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
        <Spinner size={28} color="brand"/>
      </div>
    </LecturerLayout>
  )

  if (finaliseResult) return (
    <LecturerLayout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
        <div style={{ width:'100%', maxWidth:460, textAlign:'center', padding:'0 1rem' }}>
          {/* Checkmark */}
          <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#2FA084,#1F6F5F)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem', boxShadow:'0 8px 28px rgba(47,160,132,0.35)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{width:34,height:34}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          </div>
          <h2 style={{ margin:'0 0 0.3rem', fontSize:'1.3rem', fontWeight:900, color:'#0f172a' }}>Session Finalised</h2>
          <p style={{ margin:'0 0 1.5rem', fontSize:'0.82rem', color:'#64748b' }}>
            {finaliseResult.course?.code} — Week {finaliseResult.week}
          </p>

          {/* Summary row */}
          <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.75rem' }}>
            {[
              { n: finaliseResult.present, label:'Present', color:'#16a34a', bg:'rgba(34,197,94,0.07)', border:'rgba(34,197,94,0.18)' },
              { n: finaliseResult.absent,  label:'Absent',  color:'#dc2626', bg:'rgba(239,68,68,0.07)',  border:'rgba(239,68,68,0.18)' },
              { n: finaliseResult.present + finaliseResult.absent, label:'Total', color:'#1e293b', bg:'#f8fafc', border:'#e2e8f0' },
            ].map(({ n, label, color, bg, border }) => (
              <div key={label} style={{ flex:1, padding:'0.85rem 0', borderRadius:12, background:bg, border:`1px solid ${border}` }}>
                <p style={{ margin:'0 0 0.15rem', fontSize:'1.6rem', fontWeight:900, color, lineHeight:1 }}>{n}</p>
                <p style={{ margin:0, fontSize:'0.6rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Where to find records */}
          <p style={{ margin:'0 0 0.75rem', fontSize:'0.75rem', color:'#94a3b8', fontWeight:600 }}>View your records in:</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.55rem' }}>
            <button onClick={() => navigate('/lecturer/attendance')}
              style={{ display:'flex', alignItems:'center', gap:'0.7rem', padding:'0.85rem 1.1rem', borderRadius:13, border:'1.5px solid #2FA084', background:'rgba(47,160,132,0.05)', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'background 0.18s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(47,160,132,0.1)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(47,160,132,0.05)'}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(47,160,132,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2FA084" strokeWidth="1.8" style={{width:18,height:18}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:'0 0 0.1rem', fontSize:'0.85rem', fontWeight:800, color:'#0f172a' }}>Attendance Register</p>
                <p style={{ margin:0, fontSize:'0.68rem', color:'#64748b' }}>Weekly register — who was present or absent each class</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{width:14,height:14,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </button>

            <button onClick={() => navigate('/lecturer/reports')}
              style={{ display:'flex', alignItems:'center', gap:'0.7rem', padding:'0.85rem 1.1rem', borderRadius:13, border:'1.5px solid #e2e8f0', background:'#fafafa', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'background 0.18s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'}
              onMouseLeave={e=>e.currentTarget.style.background='#fafafa'}>
              <div style={{ width:36, height:36, borderRadius:10, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" style={{width:18,height:18}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:'0 0 0.1rem', fontSize:'0.85rem', fontWeight:800, color:'#0f172a' }}>Reports & Analytics</p>
                <p style={{ margin:0, fontSize:'0.68rem', color:'#64748b' }}>Overall rates, weekly trends, at-risk students</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{width:14,height:14,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </button>
          </div>

          <button onClick={() => setFinaliseResult(null)}
            style={{ marginTop:'1.1rem', background:'none', border:'none', fontSize:'0.75rem', color:'#94a3b8', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
            ← Start another session
          </button>
        </div>
      </div>
    </LecturerLayout>
  )

  function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <LecturerLayout>
      {/* ── Compact centered card ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'center', minHeight:'100%', paddingTop:'1.5rem' }}>
        <div style={{ width:'100%', maxWidth:920, display:'flex', flexDirection:'column', gap:'0.65rem' }}>

          {/* ── Animated greeting ── */}
          <div style={{ animation:'greetJump 0.55s cubic-bezier(0.34,1.56,0.64,1) both', marginBottom:'0.15rem' }}>
            <h1 style={{ margin:0, fontSize:'1.4rem', fontWeight:900, color:'#1F6F5F', letterSpacing:'-0.01em', lineHeight:1.1 }}>
              {getGreeting()}, {profile?.name || 'Lecturer'}
            </h1>
            <p style={{ margin:'0.22rem 0 0', fontSize:'0.78rem', color:'#64748b', fontWeight:400 }}>
              Ready to take attendance — select a course and start scanning.
            </p>
          </div>

          {/* Session bar */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', background:'#fff', borderRadius:12, border:'1px solid #f1f5f9', padding:'0.55rem 0.875rem', boxShadow:'0 2px 12px rgba(31,111,95,0.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.45rem', flex:1, minWidth:0 }}>
              <span style={{ fontSize:'0.58rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>Course</span>
              <select value={scan.activeCourse?.id || ''}
                onChange={e => scan.setActiveCourse(courses.find(c => c.id === e.target.value))}
                style={{ flex:1, padding:'0.32rem 0.55rem', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:'0.78rem', fontWeight:700, color:'#1e293b', background:'#f8fafc', outline:'none', cursor:'pointer', fontFamily:'inherit', minWidth:0 }}>
                {courses.length === 0 && <option value="">No courses assigned</option>}
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.45rem', flexShrink:0 }}>
              <span style={{ fontSize:'0.58rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Week</span>
              <select value={scan.activeWeek} onChange={e => scan.setActiveWeek(+e.target.value)}
                style={{ padding:'0.32rem 0.55rem', borderRadius:7, border:'1.5px solid #e2e8f0', fontSize:'0.78rem', fontWeight:700, color:'#1e293b', background:'#f8fafc', outline:'none', cursor:'pointer', fontFamily:'inherit' }}>
                {Array.from({ length: totalWeeks }, (_, i) => (
                  <option key={i+1} value={i+1}>Week {i+1} of {totalWeeks}</option>
                ))}
              </select>
            </div>
            <div style={{ width:1, height:24, background:'#e2e8f0', flexShrink:0 }}/>
            <div style={{ display:'flex', gap:'1rem', flexShrink:0 }}>
              {[{ label:'Session', val: scan.session }, { label:'Date', val: new Date().toLocaleDateString('en-GB') }].map(({ label, val }) => (
                <div key={label} style={{ textAlign:'right' }}>
                  <p style={{ margin:0, fontSize:'0.55rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</p>
                  <p style={{ margin:0, fontSize:'0.75rem', fontWeight:800, color:'#1e293b' }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Manual entry fallback — shown when face server is offline */}
          {serverOnline === false && (
            <div style={{ background:'#fff', borderRadius:12, border:'1.5px solid rgba(245,158,11,0.35)', padding:'0.75rem 1rem', boxShadow:'0 2px 12px rgba(245,158,11,0.08)', display:'flex', alignItems:'center', gap:'0.8rem', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexShrink:0 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444' }}/>
                <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#92400e' }}>Face server offline — manual entry mode</span>
              </div>
              <div style={{ display:'flex', gap:'0.45rem', flex:1, minWidth:220 }}>
                <input
                  type="text" value={manualMatric} placeholder="Enter matric number…"
                  onChange={e => setManualMatric(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleManualMark('present')}
                  style={{ flex:1, padding:'0.42rem 0.75rem', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:'0.8rem', fontWeight:700, color:'#1e293b', background:'#f8fafc', outline:'none', fontFamily:'inherit', letterSpacing:'0.04em' }}
                />
                <button onClick={() => handleManualMark('present')} disabled={manualMarking || !manualMatric.trim()}
                  style={{ padding:'0.42rem 0.85rem', borderRadius:8, border:'none', background:'#2FA084', color:'#fff', fontWeight:700, fontSize:'0.75rem', cursor: manualMatric.trim() ? 'pointer' : 'not-allowed', fontFamily:'inherit', opacity: manualMatric.trim() ? 1 : 0.5 }}>
                  Present
                </button>
                <button onClick={() => handleManualMark('absent')} disabled={manualMarking || !manualMatric.trim()}
                  style={{ padding:'0.42rem 0.85rem', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontWeight:700, fontSize:'0.75rem', cursor: manualMatric.trim() ? 'pointer' : 'not-allowed', fontFamily:'inherit', opacity: manualMatric.trim() ? 1 : 0.5 }}>
                  Absent
                </button>
              </div>
            </div>
          )}

          {/* Main grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 290px', gap:'0.75rem', alignItems:'stretch' }}>

            {/* Camera card */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 2px 12px rgba(31,111,95,0.07)' }}>
              {/* Viewport */}
              <div style={{ position:'relative', height:440, background:'#07090f', overflow:'hidden' }}>
                <video ref={videoRef} autoPlay muted playsInline
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}/>

                {!active && (
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.6rem' }}>
                    <div style={{ width:52, height:52, borderRadius:16, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" style={{width:24,height:24}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"/>
                      </svg>
                    </div>
                    <p style={{ margin:0, fontSize:'0.78rem', fontWeight:700, color:'#475569', textAlign:'center' }}>Camera Off</p>
                  </div>
                )}

                {active && <FaceGuide scanning={scan.scanning}/>}

                {/* Status pill */}
                <div style={{ position:'absolute', top:10, left:10, display:'flex', alignItems:'center', gap:5, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', borderRadius:99, padding:'3px 10px 3px 7px', border:'1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background: active ? '#22c55e' : '#475569', boxShadow: active ? '0 0 0 2px rgba(34,197,94,0.3)' : 'none' }}/>
                  <span style={{ fontSize:'0.6rem', fontWeight:700, color: active ? '#fff' : 'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                    {scan.scanning ? 'Processing' : active ? 'Live' : 'Offline'}
                  </span>
                </div>
                {/* Server health badge */}
                <div style={{ position:'absolute', top:10, right:10, display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', borderRadius:99, padding:'3px 8px 3px 6px', border:'1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background: serverOnline === null ? '#f59e0b' : serverOnline ? '#22c55e' : '#ef4444' }}/>
                    <span style={{ fontSize:'0.55rem', fontWeight:700, color:'rgba(255,255,255,0.8)', letterSpacing:'0.06em' }}>
                      {serverOnline === null ? 'Checking…' : serverOnline ? 'AI Server' : 'Server Offline'}
                    </span>
                  </div>
                  {serverOnline === false && (
                    <button onClick={async () => { setServerOnline(null); const ok = await checkFaceServer(); setServerOnline(ok) }}
                      style={{ background:'rgba(47,160,132,0.85)', border:'none', borderRadius:99, padding:'3px 10px', fontSize:'0.55rem', fontWeight:800, color:'#fff', cursor:'pointer', letterSpacing:'0.06em' }}>
                      RETRY
                    </button>
                  )}
                </div>

                {/* Confidence strip */}
                {active && scan.lastDetection && (
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0.5rem 0.75rem', background:'linear-gradient(0deg,rgba(7,9,15,0.85) 0%,transparent 100%)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.5)', fontWeight:600 }}>Confidence</span>
                      <span style={{ fontSize:'0.58rem', color:'#4ade80', fontWeight:800 }}>{scan.lastDetection.confidence}%</span>
                    </div>
                    <div style={{ height:2.5, background:'rgba(255,255,255,0.1)', borderRadius:99 }}>
                      <div style={{ height:'100%', width:`${scan.lastDetection.confidence}%`, background:'linear-gradient(90deg,#2FA084,#4ade80)', borderRadius:99, transition:'width 0.5s' }}/>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div style={{ padding:'0.55rem 0.7rem', display:'flex', flexDirection:'column', gap:'0.45rem', background:'#fff' }}>
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                  {!active ? (
                    <button onClick={handleStartCamera}
                      style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.48rem 1.1rem', borderRadius:9, border:'none', background:'#2FA084', color:'#fff', fontWeight:700, fontSize:'0.76rem', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 10px rgba(47,160,132,0.3)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:12,height:12}}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"/></svg>
                      Start Camera
                    </button>
                  ) : (
                    <button onClick={handleStopCamera}
                      style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.48rem 1.1rem', borderRadius:9, border:'none', background:'#ef4444', color:'#fff', fontWeight:700, fontSize:'0.76rem', cursor:'pointer', fontFamily:'inherit' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:12,height:12}}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"/></svg>
                      Stop
                    </button>
                  )}
                  <button onClick={() => { if (active) switchCamera() }}
                    style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.48rem 0.75rem', borderRadius:9, border:'1.5px solid #e2e8f0', background:'#fff', color:'#475569', fontWeight:700, fontSize:'0.72rem', cursor:'pointer', fontFamily:'inherit' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:12,height:12}}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
                    Flip
                  </button>
                  <div style={{ flex:1 }}/>
                  <span style={{ fontSize:'0.6rem', color:'#94a3b8', fontWeight:600 }}>
                    {active ? '● Auto-scanning' : 'Camera idle'}
                  </span>
                </div>
                <div>
                  <ModeToggle mode={scan.scanMode} onChange={scan.setScanMode}/>
                  <p style={{ margin:'0.3rem 0 0', fontSize:'0.6rem', color:'#94a3b8', textAlign:'center', lineHeight:1.4 }}>
                    {scan.scanMode === 'single'
                      ? 'Detect one face — confirm each student manually'
                      : 'Auto-marks present on detection — students walk past the camera'}
                  </p>
                </div>
                {camError && <p style={{ margin:0, fontSize:'0.68rem', color:'#dc2626', fontWeight:600 }}>{camError}</p>}
              </div>
            </div>

            {/* Right panel */}
            <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem', height:'100%' }}>

              {/* Recognition */}
              <div style={{
                background:'#fff',
                borderRadius:14,
                border: scan.pendingApproval ? '2px solid #2FA084' : wrongLevelStudent ? '2px solid #dc2626' : alreadyMarked ? '2px solid #f59e0b' : '1px solid #f1f5f9',
                padding:'0.75rem',
                boxShadow: scan.pendingApproval ? '0 4px 20px rgba(47,160,132,0.15)' : wrongLevelStudent ? '0 4px 20px rgba(220,38,38,0.12)' : alreadyMarked ? '0 4px 20px rgba(245,158,11,0.12)' : '0 2px 12px rgba(31,111,95,0.07)',
                transition:'border 0.3s, box-shadow 0.3s',
              }}>
                {scan.pendingApproval ? (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:'0.6rem' }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:'#2FA084' }}/>
                      <span style={{ fontSize:'0.55rem', fontWeight:800, color:'#2FA084', textTransform:'uppercase', letterSpacing:'0.1em' }}>Match Found</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.6rem' }}>
                      <div style={{ width:38, height:38, borderRadius:11, background:'rgba(47,160,132,0.10)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', fontWeight:900, color:'#2FA084', flexShrink:0 }}>
                        {scan.pendingApproval.student.name?.charAt(0)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:'0 0 0.1rem', fontWeight:800, fontSize:'0.8rem', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{scan.pendingApproval.student.name}</p>
                        <p style={{ margin:0, fontSize:'0.62rem', color:'#94a3b8', fontFamily:'monospace' }}>{scan.pendingApproval.student.matric}</p>
                      </div>
                      <span style={{ fontSize:'1.1rem', fontWeight:900, color:'#2FA084', flexShrink:0 }}>{scan.pendingApproval.confidence}%</span>
                    </div>
                    <div style={{ height:3, background:'#f1f5f9', borderRadius:99, marginBottom:'0.6rem' }}>
                      <div style={{ height:'100%', width:`${scan.pendingApproval.confidence}%`, background:'linear-gradient(90deg,#2FA084,#4ade80)', borderRadius:99 }}/>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                      <button onClick={handleAccept}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.3rem', padding:'0.55rem', borderRadius:9, border:'none', background:'#16a34a', color:'#fff', fontWeight:800, fontSize:'0.75rem', cursor:'pointer', fontFamily:'inherit' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:12,height:12}}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>Accept
                      </button>
                      <button onClick={handleReject}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.3rem', padding:'0.55rem', borderRadius:9, border:'none', background:'#dc2626', color:'#fff', fontWeight:800, fontSize:'0.75rem', cursor:'pointer', fontFamily:'inherit' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:12,height:12}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>Reject
                      </button>
                    </div>
                  </>
                ) : wrongLevelStudent ? (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:'0.6rem' }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:'#dc2626' }}/>
                      <span style={{ fontSize:'0.55rem', fontWeight:800, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.1em' }}>Wrong Class</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.55rem' }}>
                      <div style={{ width:38, height:38, borderRadius:11, background:'rgba(220,38,38,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', fontWeight:900, color:'#dc2626', flexShrink:0 }}>
                        {wrongLevelStudent.result.student.name?.charAt(0)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:'0 0 0.1rem', fontWeight:800, fontSize:'0.8rem', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{wrongLevelStudent.result.student.name}</p>
                        <p style={{ margin:0, fontSize:'0.62rem', color:'#94a3b8', fontFamily:'monospace' }}>{wrongLevelStudent.result.student.matric}</p>
                      </div>
                    </div>
                    {/* Level mismatch badge */}
                    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.42rem 0.6rem', background:'rgba(220,38,38,0.06)', borderRadius:8, border:'1px solid rgba(220,38,38,0.18)', marginBottom:'0.55rem' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{width:13,height:13,flexShrink:0}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                      </svg>
                      <span style={{ fontSize:'0.68rem', color:'#b91c1c', fontWeight:700 }}>
                        Student is <span style={{ background:'rgba(220,38,38,0.12)', borderRadius:4, padding:'0 4px' }}>{wrongLevelStudent.result.student.level}</span>
                        {' '}— course is for <span style={{ background:'rgba(47,160,132,0.12)', color:'#1F6F5F', borderRadius:4, padding:'0 4px' }}>{wrongLevelStudent.courseLevel}</span>
                      </span>
                    </div>
                    {/* Actions — only in single mode; continuous auto-dismisses */}
                    {scan.scanMode === 'single' && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                        <button onClick={handleDismissWrongLevel}
                          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.3rem', padding:'0.52rem', borderRadius:9, border:'1.5px solid #e2e8f0', background:'#fff', color:'#475569', fontWeight:700, fontSize:'0.72rem', cursor:'pointer', fontFamily:'inherit' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:11,height:11}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                          Dismiss
                        </button>
                        <button onClick={handleForceAccept}
                          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.3rem', padding:'0.52rem', borderRadius:9, border:'none', background:'#7c3aed', color:'#fff', fontWeight:700, fontSize:'0.72rem', cursor:'pointer', fontFamily:'inherit' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:11,height:11}}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                          Force Accept
                        </button>
                      </div>
                    )}
                  </>
                ) : alreadyMarked ? (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:'0.6rem' }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b' }}/>
                      <span style={{ fontSize:'0.55rem', fontWeight:800, color:'#d97706', textTransform:'uppercase', letterSpacing:'0.1em' }}>Already Marked</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.55rem' }}>
                      <div style={{ width:38, height:38, borderRadius:11, background:'rgba(245,158,11,0.10)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', fontWeight:900, color:'#d97706', flexShrink:0 }}>
                        {alreadyMarked.student.name?.charAt(0)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:'0 0 0.1rem', fontWeight:800, fontSize:'0.8rem', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{alreadyMarked.student.name}</p>
                        <p style={{ margin:0, fontSize:'0.62rem', color:'#94a3b8', fontFamily:'monospace' }}>{alreadyMarked.student.matric}</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.42rem 0.6rem', background:'rgba(245,158,11,0.07)', borderRadius:8, border:'1px solid rgba(245,158,11,0.18)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{width:13,height:13,flexShrink:0}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span style={{ fontSize:'0.68rem', fontWeight:700, color:'#d97706' }}>Attendance already recorded this session</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                    <div style={{ width:34, height:34, borderRadius:10, background: scanStatus === 'no_face' ? 'rgba(245,158,11,0.08)' : scanStatus === 'no_match' ? 'rgba(239,68,68,0.06)' : scanStatus === 'matching' ? 'rgba(47,160,132,0.08)' : '#f8fafc', border: `1px solid ${scanStatus === 'no_face' ? 'rgba(245,158,11,0.2)' : scanStatus === 'no_match' ? 'rgba(239,68,68,0.15)' : scanStatus === 'matching' ? 'rgba(47,160,132,0.2)' : '#f1f5f9'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={scanStatus === 'no_face' ? '#f59e0b' : scanStatus === 'no_match' ? '#ef4444' : scanStatus === 'matching' ? '#2FA084' : '#cbd5e1'} strokeWidth="1.5" style={{width:16,height:16}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{ margin:'0 0 0.1rem', fontSize:'0.78rem', fontWeight:700, color: !active ? '#94a3b8' : scanStatus === 'no_face' ? '#d97706' : scanStatus === 'no_match' ? '#dc2626' : scanStatus === 'matching' ? '#2FA084' : '#475569' }}>
                        {!active ? 'Ready' : scanStatus === 'no_face' ? 'No face in frame' : scanStatus === 'matching' ? 'Matching face…' : scanStatus === 'no_match' ? 'No match found' : 'Scanning…'}
                      </p>
                      <p style={{ margin:0, fontSize:'0.65rem', color:'#cbd5e1' }}>
                        {!active ? 'Start camera to begin' : scanStatus === 'no_face' ? 'Centre your face in the guide' : scanStatus === 'no_match' ? 'Not enrolled or low confidence' : 'Auto-detects faces'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ background:'#fff', borderRadius:13, border:'1px solid #f1f5f9', padding:'0.75rem', boxShadow:'0 2px 12px rgba(31,111,95,0.07)' }}>
                <p style={{ margin:'0 0 0.6rem', fontSize:'0.58rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em' }}>Session Stats</p>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  {[
                    { n: present,        label:'Present', color:'#16a34a', bg:'rgba(34,197,94,0.07)',  border:'rgba(34,197,94,0.14)' },
                    { n: absent,         label:'Absent',  color:'#dc2626', bg:'rgba(239,68,68,0.07)',  border:'rgba(239,68,68,0.14)' },
                    { n: present+absent, label:'Total',   color:'#1e293b', bg:'#f8fafc',               border:'#f1f5f9' },
                  ].map(({ n, label, color, bg, border }) => (
                    <div key={label} style={{ flex:1, textAlign:'center', padding:'0.65rem 0.3rem', borderRadius:10, background:bg, border:`1px solid ${border}` }}>
                      <p style={{ margin:'0 0 0.15rem', fontSize:'1.4rem', fontWeight:900, color, lineHeight:1 }}>{n}</p>
                      <p style={{ margin:0, fontSize:'0.58rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Present list */}
              <div style={{ background:'#fff', borderRadius:13, border:'1px solid #f1f5f9', padding:'0.75rem', boxShadow:'0 2px 12px rgba(31,111,95,0.07)', flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
                <p style={{ margin:'0 0 0.4rem', fontSize:'0.55rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', flexShrink:0 }}>Present · {present}</p>
                {present === 0
                  ? <p style={{ margin:0, fontSize:'0.68rem', color:'#e2e8f0', fontWeight:600, textAlign:'center', padding:'0.5rem 0' }}>None yet</p>
                  : <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.22rem' }}>
                      {scan.presentList.map((s, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.28rem 0.4rem', borderRadius:7, background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.1)' }}>
                          <div style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', flexShrink:0 }}/>
                          <span style={{ flex:1, fontSize:'0.7rem', fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
                          <span style={{ fontSize:'0.58rem', color:'#94a3b8', fontFamily:'monospace', flexShrink:0 }}>{s.matric}</span>
                        </div>
                      ))}
                    </div>
                }
              </div>

              {/* Finalise */}
              <button onClick={() => setShowFinalise(true)}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', padding:'0.72rem', borderRadius:11, border:'none', background:'linear-gradient(135deg,#2FA084,#1F6F5F)', color:'#fff', fontWeight:800, fontSize:'0.82rem', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 3px 14px rgba(47,160,132,0.35)', transition:'opacity 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.88'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"/>
                </svg>
                Finalise Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes greetJump {
          0%   { opacity:0; transform:translateY(18px) scale(0.94); }
          55%  { transform:translateY(-7px) scale(1.025); }
          75%  { transform:translateY(3px) scale(0.99); }
          90%  { transform:translateY(-2px) scale(1.005); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>

      <ConfirmModal
        open={showFinalise}
        onClose={() => setShowFinalise(false)}
        onConfirm={handleFinalise}
        title="Finalise Session"
        message={`Mark all unscanned students absent? ${present} present so far.`}
        confirmLabel="Finalise & Mark Absent"
        loading={finalising}
        danger
      />
    </LecturerLayout>
  )
}
