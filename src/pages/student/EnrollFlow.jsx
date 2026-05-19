import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { studentLookup } from '@/services/authService'
import { saveStudentDescriptors, checkDuplicateFace, saveStudentPin } from '@/services/studentService'
import {
  loadFaceModels,
  checkFaceServer,
  getEyeAspectRatio,
  getHeadTurnRatio,
  getNoseTipY,
  captureFrames,
  getEmbeddingsFromServer,
  LIVENESS_STEPS,
} from '@/services/faceService'
import { useCamera } from '@/hooks/useCamera'
import { useToast } from '@/components/ui/Toast'
import { AnimatedTitle } from '@/components/ui/AnimatedTitle'
import logo from '../../assets/gaposa-logo.png'
import img1 from "@/assets/electric-pole-foggy-day.jpg"
import img2 from "@/assets/warm-filament-bulbs-cast-cozy-amber-glow-dimly-lit-room.jpg"
import img3 from "@/assets/sun-setting-silhouette-electricity-pylons.jpg"

const SLIDES = [img1, img2, img3]

const EAR_BLINK_THRESHOLD = 0.22
const TURN_THRESHOLD      = 0.28
const NOD_THRESHOLD       = 18
const NORMAL_HOLD_FRAMES  = 30

const lastSpoken = { text: '', time: 0 }
function speak(text, force = false) {
  if (!('speechSynthesis' in window)) return
  const now = Date.now()
  if (!force && lastSpoken.text === text && now - lastSpoken.time < 3500) return
  lastSpoken.text = text; lastSpoken.time = now
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1.0; u.pitch = 1.0; u.volume = 1
  window.speechSynthesis.speak(u)
}

const BackIcon    = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>)
const CheckIcon   = ({size=20,color='#22c55e'}) => (<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} style={{width:size,height:size,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>)
const XIcon       = ({size=20,color='#ef4444'}) => (<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} style={{width:size,height:size,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>)
const CamIcon     = ({size=18,color='currentColor'}) => (<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} style={{width:size,height:size}}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/></svg>)
const RetakeIcon  = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>)
const UploadIcon  = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>)
const UserIcon    = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={1.5} style={{width:32,height:32}}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>)
const EyeIcon     = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>)
const SpeakerIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:13,height:13}}><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"/></svg>)

const StepIcons = {
  // Face scan with corner brackets — "Look straight"
  normal: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} style={{width:22,height:22}}>
      <path strokeLinecap="round" d="M3 8.5V6A3 3 0 016 3h2.5"/>
      <path strokeLinecap="round" d="M15.5 3H18a3 3 0 013 3v2.5"/>
      <path strokeLinecap="round" d="M21 15.5V18a3 3 0 01-3 3h-2.5"/>
      <path strokeLinecap="round" d="M8.5 21H6a3 3 0 01-3-3v-2.5"/>
      <circle cx="12" cy="12" r="3.2" strokeWidth={1.5}/>
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  // Eye with lashes — "Blink"
  blink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} style={{width:22,height:22}}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>
      <circle cx="12" cy="12" r="2.8" strokeWidth={1.5}/>
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
      <path strokeLinecap="round" d="M9 4.5l.8 1.8M12 4v2M15 4.5l-.8 1.8" strokeWidth={1.5}/>
    </svg>
  ),
  // Face with bilateral arrows — "Turn head"
  turn: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} style={{width:22,height:22}}>
      <circle cx="12" cy="11" r="4" strokeWidth={1.5}/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 11H2m0 0l2.5-2.5M2 11l2.5 2.5"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11h3m0 0l-2.5-2.5M22 11l-2.5 2.5"/>
      <path strokeLinecap="round" d="M9 18.5c0-1.7 1.34-3 3-3s3 1.3 3 3" strokeWidth={1.5}/>
    </svg>
  ),
  // Face with up-down arrows — "Nod head"
  nod: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} style={{width:22,height:22}}>
      <circle cx="12" cy="12" r="4" strokeWidth={1.5}/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5V2m0 0L9.5 4.5M12 2l2.5 2.5"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v3m0 0l-2.5-2.5M12 22l2.5-2.5"/>
      <circle cx="10.5" cy="11.5" r="0.8" fill="currentColor" stroke="none"/>
      <circle cx="13.5" cy="11.5" r="0.8" fill="currentColor" stroke="none"/>
    </svg>
  ),
}

const STEP_CFG = {
  normal: { accent:'#60a5fa', bg:'rgba(96,165,250,0.12)'  },
  blink:  { accent:'#c084fc', bg:'rgba(192,132,252,0.12)' },
  turn:   { accent:'#fb923c', bg:'rgba(251,146,60,0.12)'  },
  nod:    { accent:'#34d399', bg:'rgba(52,211,153,0.12)'  },
}

function GlassLayout({ children }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setActive(s => (s + 1) % SLIDES.length), 4000)
    return () => clearInterval(iv)
  }, [])
  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', fontFamily:"'Albert Sans',sans-serif", overflow:'hidden' }}>
      {SLIDES.map((src, i) => (
        <div key={i} style={{ position:'absolute', inset:0, backgroundImage:`url(${src})`, backgroundSize:'cover', backgroundPosition:'center', opacity: i === active ? 1 : 0, zIndex: i === active ? 1 : 0, transition:'opacity 1s ease' }} />
      ))}
      <div style={{ position:'absolute', inset:0, zIndex:2, background:'linear-gradient(120deg,rgba(31,111,95,0.75) 0%,rgba(31,111,95,0.58) 50%,rgba(31,111,95,0.80) 100%)' }} />
      <div style={{ position:'relative', zIndex:10, flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {children}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        input::placeholder{color:rgba(255,255,255,0.5)}
        input:focus{border-color:rgba(255,255,255,0.35)!important;outline:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes flash{0%{opacity:0;transform:scale(0.96)}100%{opacity:1;transform:scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes successPop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        @keyframes stepPulse{0%,100%{transform:translateX(0);opacity:0.4}50%{transform:translateX(3px);opacity:1}}
        @keyframes arrowBounce{0%,100%{transform:translateX(0) scale(1);opacity:0.85}25%{transform:translateX(-6px) scale(1.1);opacity:1}50%{transform:translateX(-3px) scale(1.05);opacity:1}75%{transform:translateX(-6px) scale(1.1);opacity:1}}
        @keyframes tipPop{from{opacity:0;transform:translateX(-14px) scale(0.97)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes btnPulse{0%{box-shadow:0 0 0 0 rgba(47,160,132,0.55);transform:scale(1)}60%{box-shadow:0 0 0 18px rgba(47,160,132,0);transform:scale(1.07)}100%{box-shadow:0 0 0 0 rgba(47,160,132,0);transform:scale(1)}}
        @keyframes btnPulseIndigo{0%{box-shadow:0 0 0 0 rgba(47,160,132,0.4);transform:scale(1)}60%{box-shadow:0 0 0 18px rgba(47,160,132,0);transform:scale(1.07)}100%{box-shadow:0 0 0 0 rgba(47,160,132,0);transform:scale(1)}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideFromLeft{0%{opacity:0;transform:translateX(-48px)}100%{opacity:1;transform:translateX(0)}}
        @keyframes enrollTitleGlow{0%,100%{text-shadow:0 2px 24px rgba(0,0,0,0.8),0 0 32px rgba(111,207,151,0.4)}50%{text-shadow:0 2px 28px rgba(0,0,0,0.85),0 0 52px rgba(111,207,151,0.75),0 0 80px rgba(111,207,151,0.22)}}
      `}</style>
    </div>
  )
}

function TopBar({ title, onBack }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.7rem 1.1rem', background:'rgba(31,111,95,0.82)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.12)', flexShrink:0 }}>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:'9px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.88)', cursor:'pointer', flexShrink:0 }}><BackIcon /></button>
      <div style={{ display:'flex', alignItems:'center', gap:'0.55rem', flex:1 }}>
        <div style={{ width:40, height:40, borderRadius:'11px', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'4px', overflow:'hidden', boxShadow:'0 3px 12px rgba(0,0,0,0.28)', flexShrink:0 }}>
          <img src={logo} alt="GAPOSA" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
        </div>
        <div>
          <p style={{ margin:0, fontWeight:900, color:'#fff', fontSize:'0.92rem', lineHeight:1.1, letterSpacing:'0.03em' }}>EEE FACE-ID</p>
          <p style={{ margin:'0.05rem 0 0', fontSize:'0.58rem', color:'rgba(255,255,255,0.68)', fontWeight:500, lineHeight:1.2 }}>Face Recognition Attendance System</p>
          <p style={{ margin:'0.04rem 0 0', fontSize:'0.57rem', color:'#6FCF97', fontWeight:700, lineHeight:1.2 }}>Gateway ICT Polytechnic</p>
        </div>
      </div>
      <button onClick={()=>window.location.href='/'} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.88)', fontSize:'0.7rem', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>Login</button>
    </div>
  )
}

function StepBar({ current }) {
  const steps = ['Verify','Instructions','Enroll','Complete']
  const els = []
  steps.forEach((s,i) => {
    if (i > 0) {
      const active = i === current + 1
      els.push(
        <div key={`c${i}`} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'0.85rem' }}>
          {[0,1,2,3].map(j => (
            <svg key={j} viewBox="0 0 24 24" fill="none"
              stroke={i <= current ? '#4ade80' : 'rgba(255,255,255,0.25)'}
              strokeWidth={2.8} style={{ width:13, height:13, marginLeft: j > 0 ? '-4px' : 0,
                opacity: 0.35 + j * 0.2,
                animation: active ? `stepPulse 1s ease-in-out ${j*0.12}s infinite` : 'none',
                flexShrink:0, willChange:'transform', transition:'stroke 0.3s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          ))}
        </div>
      )
    }
    els.push(
      <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.2rem', flexShrink:0 }}>
        <div style={{
          width:25, height:25, borderRadius:'50%',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'0.62rem', fontWeight:800,
          background: i < current ? '#22c55e' : i === current ? '#2FA084' : 'rgba(255,255,255,0.08)',
          color: i <= current ? '#ffffff' : 'rgba(255,255,255,0.72)',
          boxShadow: i === current ? '0 0 12px rgba(47,160,132,0.45)' : i < current ? '0 0 8px rgba(34,197,94,0.25)' : 'none',
          border: i > current ? '1.5px solid rgba(255,255,255,0.35)' : 'none',
          transition:'all 0.35s',
        }}>{i < current ? '✓' : i+1}</div>
        <span style={{ fontSize:'0.56rem', fontWeight:700, letterSpacing:'0.03em', whiteSpace:'nowrap',
          color: i === current ? '#2FA084' : i < current ? '#4ade80' : 'rgba(255,255,255,0.72)' }}>{s}</span>
      </div>
    )
  })
  return (
    <div style={{ display:'flex', alignItems:'center', width:'100%', padding:'0.55rem 0 0.25rem', flexShrink:0 }}>
      {els}
    </div>
  )
}

// ── STEP 1 ────────────────────────────────────────────────────────
export function EnrollStep1() {
  const [matric,setMatric]=useState('');const [loading,setLoading]=useState(false);const [error,setError]=useState('')
  const navigate=useNavigate();const {toast}=useToast()
  async function handleVerify(e) {
    e.preventDefault(); if(!matric.trim()){setError('Enter your matric number.');return}
    setError(''); setLoading(true)
    try {
      const student=await studentLookup(matric.trim())
      await supabase.auth.signOut()
      await supabase.auth.signInAnonymously()
      await supabase.auth.updateUser({ data: { matric: student.matric, name: student.name } })
      navigate('/auth/enroll-verify',{state:{student}})
    }
    catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }
  return (
    <GlassLayout>
      <TopBar title="Face Enrollment" onBack={()=>navigate('/')} />
      <StepBar current={0} />
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0.75rem 1rem' }}>
        <div style={{ width:'90vw', maxWidth:'400px', borderRadius:22, background:'rgba(255,255,255,0.09)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.16)', boxShadow:'0 12px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)', overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'center', paddingTop:'1.75rem', paddingBottom:'0.5rem' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'2px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}><UserIcon /></div>
          </div>
          <div style={{ padding:'0.65rem 1.75rem 1.6rem' }}>
            <h2 style={{ textAlign:'center', color:'#fff', fontFamily:"'Albert Sans',sans-serif", fontSize:'1.25rem', fontWeight:800, margin:'0 0 0.25rem' }}>Enter Your Matric Number</h2>
            <p style={{ textAlign:'center', color:'rgba(255,255,255,0.85)', fontSize:'0.78rem', margin:'0 0 1.35rem' }}>We'll use this to verify your identity</p>
            {error && (
              <div style={{ background:'rgba(220,38,38,0.18)', border:'1.5px solid rgba(239,68,68,0.65)', borderRadius:'10px', padding:'0.6rem 0.9rem', marginBottom:'0.9rem', display:'flex', alignItems:'flex-start', gap:'0.45rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ width:14, height:14, flexShrink:0, marginTop:'2px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span style={{ color:'#fff', fontSize:'0.78rem', lineHeight:1.5 }}>{error}</span>
              </div>
            )}
            <form onSubmit={handleVerify}>
              <label style={{ display:'block', color:'#6FCF97', fontSize:'0.68rem', fontWeight:600, letterSpacing:'0.09em', textTransform:'uppercase', marginBottom:'0.45rem' }}>Matric Number</label>
              <input type="text" value={matric} onChange={e=>setMatric(e.target.value.toUpperCase())} placeholder="e.g. 24010611002" required
                style={{ width:'100%', padding:'0.8rem 1rem', borderRadius:'12px', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.13)', color:'#fff', fontSize:'0.9rem', fontWeight:600, letterSpacing:'0.05em', textAlign:'center', marginBottom:'1.1rem' }} />
              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'0.85rem', borderRadius:'12px', border:'none', background:loading?'rgba(47,160,132,0.35)':'linear-gradient(135deg,#2FA084,#1F6F5F)', color:'#fff', fontWeight:700, fontSize:'0.92rem', cursor:loading?'not-allowed':'pointer', fontFamily:"'Albert Sans',sans-serif", letterSpacing:'0.04em', boxShadow:loading?'none':'0 4px 14px rgba(47,160,132,0.45)' }}>
                {loading?'Verifying…':'Verify Identity'}
              </button>
            </form>
          </div>
          <p style={{ textAlign:'center', color:'rgba(111,207,151,0.65)', fontSize:'0.63rem', margin:'0 0 1.1rem' }}>Gateway ICT Polytechnic Saapade · EEE Department</p>
        </div>
      </div>
    </GlassLayout>
  )
}

// ── STEP 2 ────────────────────────────────────────────────────────
export function EnrollVerify() {
  const {state}=useLocation();const navigate=useNavigate();const student=state?.student
  if(!student){ navigate('/auth/enroll'); return null }
  const rows=[['Name',student.name],['Matric Number',student.matric],['Level',student.level],['Course / Option',student.course||student.option]]
  return (
    <GlassLayout>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0.5rem 1rem 1rem' }}>
        <div style={{ width:'94vw', maxWidth:'500px', display:'flex', flexDirection:'column', gap:'0.65rem' }}>

          {/* StepBar — constrained to card width */}
          <StepBar current={0} />

          {/* Card */}
          <div style={{ borderRadius:24, background:'rgba(255,255,255,0.09)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.16)', boxShadow:'0 12px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)', overflow:'hidden', animation:'fadeUp 0.32s ease' }}>

          {/* Header */}
          <div style={{ padding:'1.4rem 1.5rem 1rem', display:'flex', flexDirection:'column', alignItems:'center', background:'linear-gradient(180deg,rgba(47,160,132,0.05) 0%,transparent 100%)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ position:'relative', marginBottom:'0.75rem' }}>
              <div style={{ position:'absolute', inset:'-7px', borderRadius:'50%', border:'1.5px solid rgba(34,197,94,0.2)', animation:'pulse 2.2s ease-in-out infinite' }} />
              <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(34,197,94,0.1)', border:'1.5px solid rgba(34,197,94,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CheckIcon size={22} color="#22c55e" />
              </div>
            </div>
            <h2 style={{ color:'#fff', fontFamily:"'Albert Sans',sans-serif", fontSize:'1.15rem', fontWeight:800, margin:'0 0 0.18rem', letterSpacing:'0.01em' }}>Student Found</h2>
            <p style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.73rem', margin:0 }}>Confirm your details below</p>
          </div>

          {/* Details rows */}
          <div style={{ padding:'0.3rem 0' }}>
            {rows.map(([label,value]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.68rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize:'0.71rem', color:'rgba(255,255,255,0.78)', fontWeight:500, flexShrink:0, minWidth:'90px' }}>{label}</span>
                <span style={{ fontSize:'0.84rem', color:'#fff', fontWeight:700, textAlign:'right', wordBreak:'break-word' }}>{value||'—'}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.68rem 1.5rem' }}>
              <span style={{ fontSize:'0.71rem', color:'rgba(255,255,255,0.78)', fontWeight:500 }}>Status</span>
              <div style={{ display:'flex', alignItems:'center', gap:'0.32rem', background:'rgba(47,160,132,0.22)', border:'1px solid rgba(47,160,132,0.55)', borderRadius:'99px', padding:'0.22rem 0.7rem' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#6FCF97', flexShrink:0, animation:'pulse 2s infinite' }} />
                <span style={{ fontSize:'0.67rem', color:'#fff', fontWeight:700 }}>Active on Master List</span>
              </div>
            </div>
          </div>

          {/* Confirm */}
          <div style={{ padding:'0.75rem 1.4rem 1.35rem', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ textAlign:'center', color:'rgba(255,255,255,0.88)', fontSize:'0.73rem', margin:'0 0 0.85rem', fontWeight:500 }}>Are these details correct?</p>
            <div style={{ display:'flex', gap:'0.7rem' }}>
              <button onClick={()=>navigate(-1)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.88rem', borderRadius:'13px', border:'none', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'Albert Sans',sans-serif", boxShadow:'0 4px 16px rgba(239,68,68,0.28)', letterSpacing:'0.03em' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} style={{width:15,height:15,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                Decline
              </button>
              <button onClick={()=>navigate('/auth/enroll-instructions',{state:{student}})}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.88rem', borderRadius:'13px', border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'Albert Sans',sans-serif", boxShadow:'0 4px 16px rgba(34,197,94,0.32)', letterSpacing:'0.03em' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} style={{width:15,height:15,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                Accept
              </button>
            </div>
          </div>
          </div>{/* /card */}
        </div>{/* /maxWidth wrapper */}
      </div>{/* /flex center */}
    </GlassLayout>
  )
}

// ── STEP 3 ────────────────────────────────────────────────────────
export function EnrollInstructions() {
  const {state}=useLocation();const navigate=useNavigate();const student=state?.student
  if(!student){ navigate('/auth/enroll'); return null }
  const tips=[
    { color:'#2FA084', glow:'rgba(47,160,132,0.38)', iconBg:'rgba(47,160,132,0.15)',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.7} style={{width:22,height:22}}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z"/>
      </svg>,
      title:'Brightly Lit Environment', desc:'Find a well-lit room. Avoid bright windows or lamps directly behind you.' },
    { color:'#6FCF97', glow:'rgba(111,207,151,0.38)', iconBg:'rgba(111,207,151,0.15)',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.7} style={{width:22,height:22}}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
      </svg>,
      title:'Face Inside the Frame', desc:'Look straight at the camera guide. Stay still — the system captures automatically.' },
    { color:'#1F6F5F', glow:'rgba(31,111,95,0.42)', iconBg:'rgba(31,111,95,0.2)',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.7} style={{width:22,height:22}}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
      </svg>,
      title:'Remove Face Coverings', desc:'Remove sunglasses, hats, hijabs, or face masks before starting.' },
  ]
  return (
    <GlassLayout>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0.5rem 1rem 1rem' }}>
        <div style={{ width:'94vw', maxWidth:'500px', display:'flex', flexDirection:'column', gap:'0.65rem' }}>

          <StepBar current={1} />

          <div style={{ borderRadius:24, background:'rgba(255,255,255,0.09)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.16)', boxShadow:'0 12px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)', overflow:'hidden', animation:'fadeUp 0.32s ease' }}>

            {/* Header */}
            <div style={{ padding:'1.4rem 1.5rem 1rem', display:'flex', flexDirection:'column', alignItems:'center', background:'linear-gradient(180deg,rgba(47,160,132,0.05) 0%,transparent 100%)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ position:'relative', marginBottom:'0.75rem' }}>
                <div style={{ position:'absolute', inset:'-7px', borderRadius:'50%', border:'1.5px solid rgba(47,160,132,0.2)', animation:'pulse 2.2s ease-in-out infinite' }} />
                <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(47,160,132,0.1)', border:'1.5px solid rgba(47,160,132,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2FA084" strokeWidth={1.8} style={{width:23,height:23}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                  </svg>
                </div>
              </div>
              <h2 style={{ color:'#fff', fontFamily:"'Albert Sans',sans-serif", fontSize:'1.15rem', fontWeight:800, margin:'0 0 0.2rem', letterSpacing:'0.01em' }}>Before You Begin</h2>
              <p style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.73rem', margin:0 }}>Follow these guidelines for an accurate face capture</p>
            </div>

            {/* Tips */}
            <div style={{ padding:'1rem 1.3rem 0.5rem', display:'flex', flexDirection:'column', gap:'0.55rem' }}>
              {tips.map((tip, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.85rem 1rem 0.85rem 0.9rem', borderRadius:'16px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderLeft:`3px solid ${tip.color}`, animation:`tipPop 0.38s cubic-bezier(0.34,1.2,0.64,1) ${i*0.11}s both` }}>
                  <div style={{ width:42, height:42, borderRadius:'50%', background:tip.iconBg, boxShadow:`0 0 14px ${tip.glow}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {tip.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:'0 0 0.18rem', fontWeight:700, fontSize:'0.88rem', color:'#fff', fontFamily:"'Albert Sans',sans-serif" }}>{tip.title}</p>
                    <p style={{ margin:0, fontSize:'0.72rem', color:'rgba(255,255,255,0.82)', lineHeight:1.55 }}>{tip.desc}</p>
                  </div>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:tip.color, flexShrink:0, opacity:0.6 }} />
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ margin:'0.75rem 1.3rem 0', height:'1px', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />

            {/* CTA — back pill (left) + start pill (right) */}
            <div style={{ padding:'1rem 1.5rem 2.2rem', display:'flex', justifyContent:'center', gap:'8rem' }}>
              {/* Back pill */}
              <button onClick={()=>navigate(-1)}
                style={{ padding:'0 1.1rem 0 0.9rem', height:46, borderRadius:'99px', border:'1.5px solid rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.35rem', cursor:'pointer', willChange:'transform', boxShadow:'0 2px 10px rgba(0,0,0,0.2)' }}>
                {[0,1,2].map(i => (
                  <svg key={i} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2.5}
                    style={{ width:11, height:11, marginLeft: i > 0 ? '-4px' : 0,
                      opacity: 1 - i * 0.22,
                      animation:`arrowBounce 1.4s ease-in-out ${i*0.09}s infinite`,
                      willChange:'transform', transform:'translateZ(0)', flexShrink:0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
                  </svg>
                ))}
                <span style={{ color:'rgba(255,255,255,0.7)', fontWeight:700, fontSize:'0.82rem', letterSpacing:'0.08em', fontFamily:"'Albert Sans',sans-serif" }}>BACK</span>
              </button>
              {/* Start pill */}
              <button onClick={()=>navigate('/auth/enrollment',{state:{student}})}
                style={{ padding:'0 1.4rem 0 1.1rem', height:46, borderRadius:'99px', border:'none', background:'linear-gradient(135deg,#2FA084,#1F6F5F)', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', cursor:'pointer', animation:'btnPulse 2s ease-in-out infinite', willChange:'transform', boxShadow:'0 4px 18px rgba(47,160,132,0.45)' }}>
                <svg viewBox="0 0 24 24" fill="#fff" style={{width:21,height:21,flexShrink:0,marginLeft:'2px'}}>
                  <path d="M8 5.14v13.72a1 1 0 001.5.86l10-6.86a1 1 0 000-1.72l-10-6.86A1 1 0 008 5.14z"/>
                </svg>
                <span style={{ color:'#fff', fontWeight:700, fontSize:'0.82rem', letterSpacing:'0.08em', fontFamily:"'Albert Sans',sans-serif" }}>START</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </GlassLayout>
  )
}

// ── STEP 4: Camera ────────────────────────────────────────────────
export function EnrollCamera() {
  const {state}=useLocation();const navigate=useNavigate();const student=state?.student
  const {videoRef,active:camActive,error:camError,startCamera,stopCamera}=useCamera()
  const {toast}=useToast()

  const [livenessStep,setLivenessStep] = useState(0)
  const [completed,setCompleted]       = useState([])
  const [submitting,setSubmitting]     = useState(false)
  const [submitStatus,setSubmitStatus] = useState('')
  const [phase,setPhase]               = useState('idle')
  const [capturedPhoto,setCapturedPhoto] = useState(null)
  const [showPreview,setShowPreview]   = useState(false)
  const [voiceOn,setVoiceOn]           = useState(true)
  const [liveStatus,setLiveStatus]     = useState('idle')
  const [liveMsg,setLiveMsg]           = useState('')
  const [actionMsg,setActionMsg]       = useState('')
  const [serverOnline,setServerOnline] = useState(true)
  const [duplicateError,setDuplicateError] = useState('')

  const detectionTimer  = useRef(null)
  const stableCount     = useRef(0)
  const lastStatus      = useRef('idle')
  const stepRef         = useRef(LIVENESS_STEPS[0])
  const phaseRef        = useRef('idle')
  const voiceRef        = useRef(true)
  const livenessStepRef = useRef(0)
  const completedRef    = useRef([])
  const eyeWasOpen      = useRef(true)
  const blinkCount      = useRef(0)
  const turnedLeft      = useRef(false)
  const turnedRight     = useRef(false)
  const nodBaseY        = useRef(null)
  const noddedUp        = useRef(false)
  const noddedDown      = useRef(false)
  const actionDone      = useRef(false)
  const normalHoldCount = useRef(0)
  const step1PhotoRef   = useRef(null)
  const step1FramesRef  = useRef([])

  useEffect(()=>{
    loadFaceModels()
    checkFaceServer().then(online=>{
      setServerOnline(online)
      if(!online) toast('Face server offline. Start the Python server first.','error')
    })
    return()=>{ clearTimeout(detectionTimer.current); stopCamera(); window.speechSynthesis?.cancel() }
  },[])

  useEffect(()=>{ stepRef.current=LIVENESS_STEPS[livenessStep]; livenessStepRef.current=livenessStep },[livenessStep])
  useEffect(()=>{ phaseRef.current=phase },[phase])
  useEffect(()=>{ voiceRef.current=voiceOn },[voiceOn])
  useEffect(()=>{ completedRef.current=completed },[completed])

  if(!student){ navigate('/auth/enroll'); return null }

  const totalSteps  = LIVENESS_STEPS.length
  const progressPct = phase==='done'?100:(completed.length/totalSteps)*100

  function maybeSpeak(text,force=false){ if(voiceRef.current) speak(text,force) }

  function captureSnapshot(videoEl) {
    const v=videoEl||videoRef.current; if(!v) return null
    const c=document.createElement('canvas')
    c.width=v.videoWidth||640; c.height=v.videoHeight||480
    c.getContext('2d').drawImage(v,0,0)
    return c.toDataURL('image/jpeg',0.92)
  }

  function resetLivenessTrackers() {
    eyeWasOpen.current=true; blinkCount.current=0
    turnedLeft.current=false; turnedRight.current=false
    nodBaseY.current=null; noddedUp.current=false; noddedDown.current=false
    actionDone.current=false; normalHoldCount.current=0
  }

  async function checkLivenessAction(landmarks, stepId, video) {
    if(actionDone.current) return true

    if(stepId==='normal') {
      normalHoldCount.current += 1
      const pct = Math.min(Math.round((normalHoldCount.current/NORMAL_HOLD_FRAMES)*100),99)
      setActionMsg(`Hold still… ${pct}%`)
      if(normalHoldCount.current >= NORMAL_HOLD_FRAMES) {
        // Capture high quality photo and frames
        const photo  = captureSnapshot(video)
        const frames = await captureFrames(video, 1)
        step1PhotoRef.current  = photo
        step1FramesRef.current = frames
        setActionMsg('')
        actionDone.current = true
        return true
      }
      return false
    }

    if(stepId==='blink') {
      const ear=getEyeAspectRatio(landmarks)
      if(eyeWasOpen.current && ear<EAR_BLINK_THRESHOLD){ eyeWasOpen.current=false }
      else if(!eyeWasOpen.current && ear>EAR_BLINK_THRESHOLD+0.02){
        eyeWasOpen.current=true; blinkCount.current+=1
        if(blinkCount.current>=1){ actionDone.current=true; setActionMsg(''); return true }
      }
      setActionMsg('Close your eyes slowly, then open')
      return false
    }

    if(stepId==='turn') {
      const ratio=getHeadTurnRatio(landmarks)
      if(ratio<-TURN_THRESHOLD) turnedLeft.current=true
      if(ratio>TURN_THRESHOLD)  turnedRight.current=true
      if(!turnedLeft.current)       setActionMsg('Turn your head clearly to the LEFT')
      else if(!turnedRight.current) setActionMsg('Good — now turn to the RIGHT')
      if(turnedLeft.current&&turnedRight.current){ actionDone.current=true; setActionMsg(''); return true }
      return false
    }

    if(stepId==='nod') {
      const noseY=getNoseTipY(landmarks)
      if(nodBaseY.current===null){ nodBaseY.current=noseY; return false }
      const diff=noseY-nodBaseY.current
      if(diff<-NOD_THRESHOLD) noddedUp.current=true
      if(diff>NOD_THRESHOLD)  noddedDown.current=true
      if(!noddedUp.current)        setActionMsg('Nod your head clearly UP')
      else if(!noddedDown.current) setActionMsg('Good — now nod DOWN')
      if(noddedUp.current&&noddedDown.current){ actionDone.current=true; setActionMsg(''); return true }
      return false
    }

    return false
  }

  async function runDetectionLoop() {
    const video=videoRef.current
    if(!video||video.paused||video.ended||phaseRef.current!=='capturing'){
      detectionTimer.current=setTimeout(runDetectionLoop,300); return
    }
    if(video.readyState<2){ detectionTimer.current=setTimeout(runDetectionLoop,300); return }

    try {
      const faceapi=await import('face-api.js')
      const detection=await faceapi
        .detectSingleFace(video,new faceapi.TinyFaceDetectorOptions({inputSize:224,scoreThreshold:0.4}))
        .withFaceLandmarks(true)

      let newStatus,newMsg

      if(!detection){
        newStatus='no-face'; newMsg='No face detected — look at the camera'
        setActionMsg(''); normalHoldCount.current=0
      } else {
        const dims=faceapi.matchDimensions(video,video,true)
        const resized=faceapi.resizeResults(detection,dims)
        const {width:fw,height:fh}=resized.detection.box
        const faceArea=(fw*fh)/(dims.width*dims.height)

        if(faceArea<0.05){
          newStatus='too-small'; newMsg='Move a little closer'; setActionMsg(''); normalHoldCount.current=0
        } else if(faceArea>0.60){
          newStatus='too-big'; newMsg='Move back a little'; setActionMsg(''); normalHoldCount.current=0
        } else {
          newStatus='good'; newMsg=stepRef.current?.instruction||'Face detected'
          const passed=await checkLivenessAction(detection.landmarks,stepRef.current?.id,video)

          if(passed){
            setActionMsg('')
            maybeSpeak('Good!',true)
            clearTimeout(detectionTimer.current)
            setTimeout(()=>{
              const currentStep=livenessStepRef.current
              const newCompleted=[...completedRef.current,currentStep]
              setCompleted(newCompleted); completedRef.current=newCompleted

              if(currentStep<totalSteps-1){
                const next=currentStep+1
                resetLivenessTrackers(); setActionMsg('')
                setLivenessStep(next)
                const voices={ blink:'Now blink your eyes.', turn:'Turn your head left, then right.', nod:'Nod your head up and down.' }
                maybeSpeak(voices[LIVENESS_STEPS[next]?.id]||'Next step.',true)
                setTimeout(()=>runDetectionLoop(),800)
              } else {
                clearTimeout(detectionTimer.current)
                phaseRef.current='done'
                setCapturedPhoto(step1PhotoRef.current)
                setPhase('done')
                stopCamera()
                maybeSpeak('All steps complete. Review your photo and submit.',true)
                setTimeout(()=>setShowPreview(true),700)
              }
            },500)
            return
          }
        }
      }

      if(newStatus===lastStatus.current){ stableCount.current+=1 }
      else{ stableCount.current=1; lastStatus.current=newStatus }
      if(stableCount.current>=3){
        setLiveStatus(newStatus); setLiveMsg(newMsg)
        if(stableCount.current===3&&newStatus!=='good') maybeSpeak(newMsg)
      }
    } catch(e){}

    detectionTimer.current=setTimeout(runDetectionLoop,100)
  }

  async function handleStartCamera() {
    await startCamera('user')
    setPhase('capturing'); phaseRef.current='capturing'
    resetLivenessTrackers(); setActionMsg('')
    step1PhotoRef.current=null; step1FramesRef.current=[]
    maybeSpeak('Camera started. Look straight at the camera and hold still.',true)
    setTimeout(()=>runDetectionLoop(),1000)
  }

  async function handleSubmit() {
    console.log('[handleSubmit] Starting enrollment submission for matric:', student?.matric)
    setShowPreview(false); setSubmitting(true); setDuplicateError('')

    try {
      // Step 1 — Check for duplicate face using Python /deduplicate
      // Pass the captured photo image directly — Python generates embedding + compares
      setSubmitStatus('Checking for duplicates…')
      const duplicate = await checkDuplicateFace(step1PhotoRef.current, student.matric)

      if (duplicate?.isDuplicate) {
        setDuplicateError(`Face already enrolled under a different account (${duplicate.name || duplicate.matric}). Contact admin.`)
        setShowPreview(true)
        return
      }

      // Step 2 — Generate ArcFace embeddings for storage
      setSubmitStatus('Generating face embeddings…')
      const embeddings = await getEmbeddingsFromServer(step1FramesRef.current)

      // Step 3 — Save to Supabase
      setSubmitStatus('Saving enrollment…')
      await saveStudentDescriptors(student.matric, embeddings, step1PhotoRef.current)

      navigate('/auth/enroll-success',{state:{student}})
    } catch(err){
      console.error('[EnrollSubmit]', err)
      if (err.message?.startsWith('[dedup]')) {
        // Dedup check itself failed (network/server error) — block enrollment, stay on preview
        setDuplicateError(err.message.replace('[dedup] ', ''))
        setShowPreview(true)
      } else {
        toast(err.message||'Enrollment failed','error')
        navigate('/auth/enroll-failed')
      }
    } finally {
      setSubmitting(false)
      setSubmitStatus('')
    }
  }

  function handleRetake() {
    clearTimeout(detectionTimer.current)
    setShowPreview(false); setCapturedPhoto(null)
    setLivenessStep(0); setCompleted([]); completedRef.current=[]
    setLiveStatus('idle'); setLiveMsg(''); setActionMsg('')
    setDuplicateError(''); setSubmitStatus('')
    step1PhotoRef.current=null; step1FramesRef.current=[]
    stableCount.current=0; lastStatus.current='idle'
    resetLivenessTrackers()
    setPhase('capturing'); phaseRef.current='capturing'
    startCamera('user')
    maybeSpeak('Starting over. Look straight at the camera and hold still.',true)
    setTimeout(()=>runDetectionLoop(),1200)
  }

  const SC={
    idle:       {border:'rgba(255,255,255,0.1)',  dot:'rgba(255,255,255,0.3)',text:'rgba(255,255,255,0.45)',bg:'rgba(0,0,0,0.5)'},
    'no-face':  {border:'rgba(239,68,68,0.55)',   dot:'#ef4444',             text:'#fca5a5',               bg:'rgba(239,68,68,0.16)'},
    'too-small':{border:'rgba(251,191,36,0.55)',  dot:'#fbbf24',             text:'#fef08a',               bg:'rgba(251,191,36,0.14)'},
    'too-big':  {border:'rgba(251,191,36,0.55)',  dot:'#fbbf24',             text:'#fef08a',               bg:'rgba(251,191,36,0.14)'},
    good:       {border:'rgba(74,222,128,0.55)',  dot:'#4ade80',             text:'#4ade80',               bg:'rgba(34,197,94,0.14)'},
  }
  const sc=SC[liveStatus]||SC.idle
  const bracketColor=liveStatus==='good'?'#4ade80':liveStatus==='no-face'?'#ef4444':'#fbbf24'

  return (
    <GlassLayout>

      {/* School logo — fixed top-left over background */}
      <div style={{ position:'fixed', top:'1.1rem', left:'1.3rem', zIndex:50, display:'flex', alignItems:'center', gap:'0.8rem', animation:'fadeUp 0.4s ease both' }}>
        <div style={{ width:54, height:54, borderRadius:15, background:'#ffffff', border:'1.5px solid rgba(255,255,255,0.35)', display:'flex', alignItems:'center', justifyContent:'center', padding:6, boxShadow:'0 6px 22px rgba(0,0,0,0.4)', overflow:'hidden', flexShrink:0 }}>
          <img src={logo} alt="GAPOSA" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.14rem' }}>
          <p style={{ margin:0, color:'#ffffff', fontWeight:900, fontSize:'1rem', fontFamily:"'Albert Sans',sans-serif", letterSpacing:'0.05em', lineHeight:1, textShadow:'0 1px 10px rgba(0,0,0,0.55)' }}>EEE FACE-ID</p>
          <p style={{ margin:0, color:'rgba(255,255,255,0.7)', fontSize:'0.68rem', fontFamily:"'Albert Sans',sans-serif", fontWeight:500, lineHeight:1.2, textShadow:'0 1px 6px rgba(0,0,0,0.4)' }}>Gateway ICT Polytechnic</p>
          <p style={{ margin:0, color:'#6FCF97', fontSize:'0.63rem', fontFamily:"'Albert Sans',sans-serif", fontWeight:700, lineHeight:1.2, textShadow:'0 1px 8px rgba(0,0,0,0.5), 0 0 12px rgba(111,207,151,0.35)' }}>Electrical / Electronics Engineering Dept.</p>
        </div>
      </div>

      {/* Photo review modal */}
      {showPreview&&capturedPhoto&&(
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(5,10,24,0.92)', backdropFilter:'blur(20px)' }}>
          <div style={{ width:'90vw', maxWidth:'380px', borderRadius:'22px', background:'rgba(13,20,40,0.98)', border:`1px solid ${duplicateError?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.13)'}`, boxShadow:'0 24px 80px rgba(0,0,0,0.75)', overflow:'hidden', animation:'flash 0.28s ease' }}>
            <div style={{ padding:'1.1rem 1.4rem 0.85rem', borderBottom:'1px solid rgba(255,255,255,0.08)', textAlign:'center' }}>
              <h3 style={{ color:'#fff', fontFamily:"'Albert Sans',sans-serif", fontSize:'1.1rem', fontWeight:700, margin:0, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.42rem' }}>
                {duplicateError && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={2} style={{width:18,height:18,flexShrink:0}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01"/>
                  </svg>
                )}
                {duplicateError ? 'Face Already Enrolled' : 'Review Your Photo'}
              </h3>
              <p style={{ color:'rgba(255,255,255,0.36)', fontSize:'0.72rem', margin:'0.25rem 0 0' }}>
                {duplicateError ? 'This face is linked to another account' : 'Liveness verified. Submit to complete enrollment.'}
              </p>
            </div>
            <div style={{ padding:'0.85rem 1.25rem 0.65rem' }}>
              <div style={{ borderRadius:'12px', overflow:'hidden', border:`2px solid ${duplicateError?'rgba(239,68,68,0.6)':'rgba(34,197,94,0.4)'}`, position:'relative' }}>
                <img src={capturedPhoto} alt="Captured" style={{ width:'100%', display:'block', objectFit:'cover' }} />
                <div style={{ position:'absolute', top:'0.45rem', right:'0.45rem', background:duplicateError?'rgba(239,68,68,0.9)':'rgba(34,197,94,0.9)', borderRadius:'99px', padding:'0.16rem 0.55rem', fontSize:'0.62rem', fontWeight:700, color:'#fff' }}>
                  {duplicateError ? 'DUPLICATE' : 'VERIFIED ✓'}
                </div>
              </div>
            </div>
            {duplicateError&&(
              <div style={{ margin:'0 1.25rem 0.75rem', padding:'0.8rem 1rem', borderRadius:'11px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.28)' }}>
                <p style={{ margin:'0 0 0.3rem', fontSize:'0.7rem', fontWeight:700, color:'#fca5a5', letterSpacing:'0.06em', textTransform:'uppercase' }}>Face Already Enrolled</p>
                <p style={{ margin:'0 0 0.45rem', fontSize:'0.75rem', color:'rgba(252,165,165,0.85)', lineHeight:1.5 }}>{duplicateError}</p>
                <p style={{ margin:0, fontSize:'0.7rem', color:'rgba(255,255,255,0.35)', lineHeight:1.5, borderTop:'1px solid rgba(239,68,68,0.2)', paddingTop:'0.45rem' }}>Contact the EEE department admin if you believe this is an error.</p>
              </div>
            )}
            <div style={{ padding:'0.15rem 1.25rem 1.35rem', display:'flex', gap:'0.65rem' }}>
              <button onClick={handleRetake} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', padding:'0.82rem', borderRadius:'11px', border:'1px solid rgba(239,68,68,0.32)', background:'rgba(239,68,68,0.07)', color:'#fca5a5', fontWeight:600, fontSize:'0.84rem', cursor:'pointer' }}>
                <RetakeIcon /> {duplicateError?'Try Different':'Re-enroll'}
              </button>
              {!duplicateError&&(
                <button onClick={handleSubmit} disabled={submitting} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', padding:'0.82rem', borderRadius:'11px', border:'none', background:submitting?'rgba(34,197,94,0.4)':'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontWeight:700, fontSize:'0.84rem', cursor:submitting?'not-allowed':'pointer', fontFamily:"'Albert Sans',sans-serif", flexDirection:'column' }}>
                  {submitting?(<><span style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}><svg style={{ animation:'spin 1s linear infinite', width:14, height:14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Processing</span>{submitStatus&&<span style={{ fontSize:'0.6rem', opacity:0.7, marginTop:'0.2rem' }}>{submitStatus}</span>}</>):(<><UploadIcon /> Submit</>)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main — centered card, steps as vertical sidebar */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0.6rem 0.75rem 0.75rem', overflowY:'auto' }}>
        <div style={{ width:'96vw', maxWidth:'540px', display:'flex', flexDirection:'column', gap:'0.5rem', animation:'fadeUp 0.32s ease' }}>

<StepBar current={2} />

        {/* Card — light theme */}
        <div style={{ borderRadius:22, background:'#ffffff', border:'1px solid rgba(47,160,132,0.12)', boxShadow:'0 12px 50px rgba(0,0,0,0.11), 0 0 0 1px rgba(47,160,132,0.05)', overflow:'hidden' }}>

          {/* Teal accent bar */}
          <div style={{ height:3, background:'linear-gradient(90deg,#2FA084 0%,#6FCF97 50%,#2FA084 100%)' }} />

          {/* Name + matric + voice — clean, no clutter */}
          <div style={{ display:'flex', alignItems:'center', padding:'0.78rem 1.1rem 0.8rem', borderBottom:'1px solid rgba(47,160,132,0.08)', gap:'0.6rem' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:'1.06rem', fontWeight:900, color:'#0f172a', letterSpacing:'0.03em', lineHeight:1.1, fontFamily:"'Albert Sans',sans-serif", textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {student.name}
              </p>
              <p style={{ margin:'0.28rem 0 0', fontSize:'0.73rem', fontWeight:700, color:'#2FA084', letterSpacing:'0.1em', fontFamily:"'Albert Sans',sans-serif" }}>
                {student.matric}
              </p>
            </div>
            <button onClick={()=>setVoiceOn(v=>!v)} style={{ display:'flex', alignItems:'center', gap:'0.26rem', padding:'0.3rem 0.72rem', borderRadius:99, border:`1px solid ${voiceOn?'#2FA084':'rgba(0,0,0,0.12)'}`, background:voiceOn?'rgba(47,160,132,0.08)':'rgba(0,0,0,0.03)', color:voiceOn?'#2FA084':'rgba(0,0,0,0.38)', fontSize:'0.65rem', fontWeight:700, cursor:'pointer', transition:'all 0.2s', flexShrink:0, fontFamily:"'Albert Sans',sans-serif" }}>
              <SpeakerIcon />{voiceOn?' On':' Off'}
            </button>
          </div>

          {/* Camera + Step sidebar */}
          <div style={{ display:'flex', gap:'0.6rem', margin:'0.75rem 0.8rem 0' }}>

            {/* Camera */}
            <div style={{ flex:1, position:'relative', borderRadius:14, overflow:'hidden', background:'#060c18', height:340, border:'1px solid rgba(0,0,0,0.07)' }}>
              <video ref={videoRef} autoPlay muted playsInline style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />

              {/* Rectangle face guide + corner brackets */}
              {camActive&&phase==='capturing'&&(
                <>
                  {/* Subtle rectangle fill */}
                  <div style={{ position:'absolute', top:'7%', left:'10%', right:'10%', bottom:'7%', borderRadius:14, border:`1px solid ${bracketColor}`, opacity:0.22, transition:'border-color 0.4s ease', pointerEvents:'none' }} />
                  {/* Bold corner L-brackets at rectangle corners */}
                  {[
                    { top:'7%',  left:'10%',  bt:true, bl:true  },
                    { top:'7%',  right:'10%', bt:true, br:true  },
                    { bottom:'7%', left:'10%',  bb:true, bl:true  },
                    { bottom:'7%', right:'10%', bb:true, br:true  },
                  ].map(({top,bottom,left,right,bt,bb,bl,br},ci)=>(
                    <div key={ci} style={{ position:'absolute', top, bottom, left, right, width:26, height:26,
                      borderTop:bt?`2.5px solid ${bracketColor}`:'none',
                      borderBottom:bb?`2.5px solid ${bracketColor}`:'none',
                      borderLeft:bl?`2.5px solid ${bracketColor}`:'none',
                      borderRight:br?`2.5px solid ${bracketColor}`:'none',
                      borderRadius:bt&&bl?'5px 0 0 0':bt&&br?'0 5px 0 0':bb&&bl?'0 0 0 5px':'0 0 5px 0',
                      opacity:0.88, transition:'border-color 0.4s ease' }} />
                  ))}
                </>
              )}

              {/* Idle */}
              {!camActive&&phase==='idle'&&(
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.9rem', background:'radial-gradient(ellipse at 50% 42%, rgba(47,160,132,0.12) 0%, transparent 65%)' }}>
                  <div style={{ position:'relative', width:90, height:90 }}>
                    <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(47,160,132,0.4)', animation:'pulse 2.2s ease-in-out infinite' }} />
                    <div style={{ position:'absolute', inset:9, borderRadius:'50%', border:'1.5px solid rgba(47,160,132,0.08)' }} />
                    <div style={{ position:'absolute', inset:0, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(47,160,132,0.72)" strokeWidth={1.35} style={{width:40,height:40}}>
                        <path strokeLinecap="round" d="M3 8.5V6A3 3 0 016 3h2.5M15.5 3H18a3 3 0 013 3v2.5M21 15.5V18a3 3 0 01-3 3h-2.5M8.5 21H6a3 3 0 01-3-3v-2.5"/>
                        <circle cx="12" cy="11.5" r="3.6" strokeWidth={1.3}/>
                        <circle cx="12" cy="11.5" r="1.4" fill="rgba(47,160,132,0.65)" stroke="none"/>
                      </svg>
                    </div>
                  </div>
                  <div style={{ textAlign:'center', padding:'0 0.5rem' }}>
                    <p style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.82rem', margin:'0 0 0.22rem', fontWeight:700 }}>Camera Ready</p>
                    <p style={{ color:'rgba(255,255,255,0.32)', fontSize:'0.67rem', margin:0, lineHeight:1.5 }}>Position yourself in<br/>good lighting</p>
                  </div>
                </div>
              )}

              {/* Status pill */}
              {camActive&&phase==='capturing'&&(
                <div style={{ position:'absolute', bottom:'0.65rem', left:'50%', transform:'translateX(-50%)', background:sc.bg, border:`1px solid ${sc.border}`, backdropFilter:'blur(20px)', borderRadius:99, padding:'0.3rem 0.9rem', display:'flex', alignItems:'center', gap:'0.4rem', whiteSpace:'nowrap' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:sc.dot, animation:liveStatus==='good'?'pulse 1.5s infinite':'none', flexShrink:0 }} />
                  <p style={{ color:sc.text, fontSize:'0.68rem', fontWeight:700, margin:0 }}>{liveMsg||stepRef.current?.instruction||'Position your face'}</p>
                </div>
              )}

              {/* Action hint */}
              {camActive&&phase==='capturing'&&liveStatus==='good'&&actionMsg&&(
                <div style={{ position:'absolute', top:'0.65rem', left:'50%', transform:'translateX(-50%)', background:'rgba(47,160,132,0.22)', border:'1px solid rgba(47,160,132,0.55)', backdropFilter:'blur(16px)', borderRadius:99, padding:'0.28rem 0.9rem', whiteSpace:'nowrap' }}>
                  <p style={{ color:'#6FCF97', fontSize:'0.68rem', fontWeight:700, margin:0 }}>{actionMsg}</p>
                </div>
              )}

              {/* Done overlay */}
              {phase==='done'&&(
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.65rem', background:'rgba(2,8,14,0.5)', backdropFilter:'blur(8px)' }}>
                  <div style={{ width:68, height:68, borderRadius:'50%', background:'rgba(34,197,94,0.15)', border:'2.5px solid rgba(34,197,94,0.45)', display:'flex', alignItems:'center', justifyContent:'center', animation:'successPop 0.45s ease' }}>
                    <CheckIcon size={30} color="#4ade80" />
                  </div>
                  <p style={{ color:'#4ade80', fontSize:'0.85rem', fontWeight:800, margin:0 }}>All steps complete!</p>
                </div>
              )}
            </div>

            {/* Step sidebar — independent floating tiles, no rail */}
            <div style={{ width:72, height:340, display:'flex', flexDirection:'column', gap:'0.38rem', flexShrink:0 }}>
              {LIVENESS_STEPS.map((step,i)=>{
                const isDone   = completed.includes(i)
                const isActive = phase==='capturing'&&i===livenessStep
                const SIcon    = StepIcons[step.id]||StepIcons.normal
                const scfg     = STEP_CFG[step.id]||STEP_CFG.normal
                return (
                  <div key={step.id} style={{
                    flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5,
                    borderRadius:12, position:'relative',
                    background: isDone ? 'rgba(34,197,94,0.07)' : isActive ? scfg.bg : 'rgba(47,160,132,0.04)',
                    border: `1px solid ${isDone?'rgba(34,197,94,0.2)':isActive?scfg.accent+'55':'rgba(47,160,132,0.08)'}`,
                    boxShadow: isActive ? `0 2px 14px ${scfg.accent}28` : 'none',
                    transition:'all 0.32s ease',
                  }}>
                    {/* Step number badge */}
                    <div style={{ position:'absolute', top:5, right:5, width:15, height:15, borderRadius:'50%',
                      background: isDone?'#22c55e':isActive?scfg.accent:'rgba(0,0,0,0.1)',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {isDone
                        ? <svg viewBox="0 0 10 10" fill="none" style={{width:8,height:8}}><path stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M2 5l2.5 2.5 3.5-4"/></svg>
                        : <span style={{ fontSize:'0.38rem', fontWeight:900, color:isActive?'#fff':'rgba(0,0,0,0.4)', lineHeight:1, fontFamily:"'Albert Sans',sans-serif" }}>{i+1}</span>
                      }
                    </div>
                    {/* Icon */}
                    <div style={{ color: isDone?'#22c55e':isActive?scfg.accent:'rgba(0,0,0,0.22)', transition:'color 0.32s ease' }}>
                      {isDone ? <CheckIcon size={16} color="#22c55e"/> : <SIcon />}
                    </div>
                    {/* Label */}
                    <p style={{ margin:0, fontSize:'0.5rem', fontWeight:isDone||isActive?700:400,
                      color:isDone?'#16a34a':isActive?scfg.accent:'rgba(0,0,0,0.3)',
                      textAlign:'center', lineHeight:1.15, fontFamily:"'Albert Sans',sans-serif", padding:'0 4px' }}>
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Server offline */}
          {!serverOnline&&(
            <div style={{ margin:'0.5rem 0.8rem 0', padding:'0.4rem 0.85rem', borderRadius:10, background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', gap:'0.4rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} style={{width:13,height:13,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l7.418-12.748c.866-1.5 3.032-1.5 3.898 0l4.09 7.049M12 15.75h.007v.008H12v-.008z"/></svg>
              <p style={{ margin:0, fontSize:'0.68rem', color:'#dc2626', fontWeight:500 }}>Face server offline — start Python server first</p>
            </div>
          )}

          {/* Progress + Action */}
          <div style={{ padding:'0.75rem 0.8rem 1.15rem', display:'flex', flexDirection:'column', gap:'0.52rem' }}>
            {/* Progress bar */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.55rem' }}>
              <div style={{ flex:1, height:8, background:'rgba(0,0,0,0.06)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#2FA084,#6FCF97)', width:`${progressPct}%`, transition:'width 0.6s ease', boxShadow: progressPct>0?'0 0 8px rgba(47,160,132,0.45)':'none' }} />
              </div>
              <span style={{ fontSize:'0.76rem', fontWeight:800, color:'#2FA084', minWidth:36, textAlign:'right' }}>{Math.round(progressPct)}%</span>
            </div>

            {phase==='idle'&&(
              <button onClick={handleStartCamera} disabled={!serverOnline}
                style={{ width:'100%', padding:'0.9rem', borderRadius:12, border:'none', background: serverOnline?'#2FA084':'rgba(47,160,132,0.18)', color: serverOnline?'#fff':'rgba(0,0,0,0.3)', fontWeight:800, fontSize:'0.9rem', cursor: serverOnline?'pointer':'not-allowed', fontFamily:"'Albert Sans',sans-serif", boxShadow: serverOnline?'0 4px 18px rgba(47,160,132,0.42)':'none', letterSpacing:'0.04em', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', transition:'all 0.2s' }}>
                <CamIcon size={18} color={serverOnline?'#fff':'rgba(0,0,0,0.3)'} />{serverOnline?'Start Face Scan':'Server Offline'}
              </button>
            )}
            {phase==='capturing'&&(
              <>
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                  <p style={{ flex:1, margin:0, fontSize:'0.7rem', color:'#64748b', lineHeight:1.45 }}>
                    {liveStatus==='good'?'Perform the action — system auto-detects':'Look into the camera and follow the prompts'}
                  </p>
                  <button onClick={handleRetake}
                    style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'0.5rem 0.9rem', borderRadius:10, border:'1px solid rgba(0,0,0,0.12)', background:'rgba(0,0,0,0.04)', color:'rgba(0,0,0,0.55)', fontSize:'0.7rem', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                    <RetakeIcon /> Restart
                  </button>
                </div>
              </>
            )}
            {phase==='done'&&(
              <button onClick={()=>setShowPreview(true)}
                style={{ width:'100%', padding:'0.9rem', borderRadius:12, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontWeight:800, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'Albert Sans',sans-serif", boxShadow:'0 4px 18px rgba(34,197,94,0.38)', letterSpacing:'0.04em', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
                <EyeIcon /> Review & Submit
              </button>
            )}
            {camError&&<p style={{ textAlign:'center', color:'#dc2626', fontSize:'0.65rem', margin:0 }}>{camError}</p>}

            {/* Back to Home — always visible at bottom */}
            <button onClick={()=>navigate('/')} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', width:'100%', padding:'0.52rem', borderRadius:10, border:'1px solid rgba(0,0,0,0.09)', background:'rgba(0,0,0,0.02)', color:'rgba(0,0,0,0.38)', fontSize:'0.72rem', fontWeight:600, cursor:'pointer', fontFamily:"'Albert Sans',sans-serif", transition:'all 0.18s ease' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,0,0,0.06)';e.currentTarget.style.color='rgba(0,0,0,0.6)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,0.02)';e.currentTarget.style.color='rgba(0,0,0,0.38)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{width:13,height:13}}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
              Back to Home
            </button>
          </div>

        </div>
        </div>
      </div>

    </GlassLayout>
  )
}

// ── Success ───────────────────────────────────────────────────────
export function EnrollSuccess() {
  const {state}=useLocation();const navigate=useNavigate();const student=state?.student
  const [pinStep,   setPinStep]  = useState(false)
  const [pin,       setPin]      = useState('')
  const [confirm,   setConfirm]  = useState('')
  const [pinErr,    setPinErr]   = useState('')
  const [saving,    setSaving]   = useState(false)

  async function handlePinSetup() {
    setPinErr('')
    if (!/^\d{4}$/.test(pin))  { setPinErr('PIN must be exactly 4 digits'); return }
    if (pin !== confirm)        { setPinErr('PINs do not match'); return }
    setSaving(true)
    try {
      if (student?.matric) await saveStudentPin(student.matric, pin)
      navigate('/auth/student')
    } catch { setPinErr('Failed to save PIN, please try again'); setSaving(false) }
  }

  if (pinStep) return (
    <GlassLayout>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
        <div style={{ width:'90vw', maxWidth:'400px', borderRadius:'22px', background:'rgba(255,255,255,0.09)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.16)', boxShadow:'0 12px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)', overflow:'hidden', animation:'fadeUp 0.35s ease' }}>
          <div style={{ padding:'2rem 1.75rem', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(99,102,241,0.12)', border:'2px solid rgba(99,102,241,0.28)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={1.8} style={{width:28,height:28}}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>
            </div>
            <h2 style={{ color:'#a5b4fc', fontFamily:"'Albert Sans',sans-serif", fontSize:'1.3rem', fontWeight:800, margin:'0 0 0.3rem' }}>Secure Your Account</h2>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', margin:'0 0 1.4rem', lineHeight:1.65 }}>
              Set a 4-digit PIN to protect your attendance portal. You'll need this each time you log in.
            </p>
            {pinErr&&(
              <div style={{ width:'100%', background:'rgba(185,28,28,0.2)', border:'1px solid rgba(252,165,165,0.22)', borderRadius:10, padding:'0.58rem 0.85rem', marginBottom:'1rem', textAlign:'left' }}>
                <p style={{ margin:0, fontSize:'0.74rem', color:'#fca5a5', fontWeight:600 }}>{pinErr}</p>
              </div>
            )}
            <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:'0.75rem', marginBottom:'1.25rem' }}>
              <input type="password" inputMode="numeric" maxLength={4} placeholder="Enter 4-digit PIN"
                value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,'').slice(0,4));setPinErr('')}}
                style={{ width:'100%', padding:'0.88rem 1rem', borderRadius:12, background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:'1.2rem', letterSpacing:'0.45em', textAlign:'center', boxSizing:'border-box', outline:'none', fontFamily:"'Albert Sans',sans-serif" }} />
              <input type="password" inputMode="numeric" maxLength={4} placeholder="Confirm PIN"
                value={confirm} onChange={e=>{setConfirm(e.target.value.replace(/\D/g,'').slice(0,4));setPinErr('')}}
                style={{ width:'100%', padding:'0.88rem 1rem', borderRadius:12, background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:'1.2rem', letterSpacing:'0.45em', textAlign:'center', boxSizing:'border-box', outline:'none', fontFamily:"'Albert Sans',sans-serif" }} />
            </div>
            <button onClick={handlePinSetup} disabled={saving} style={{ width:'100%', padding:'0.88rem', borderRadius:'12px', border:'none', background:saving?'rgba(99,102,241,0.35)':'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', fontWeight:700, fontSize:'0.92rem', cursor:saving?'not-allowed':'pointer', fontFamily:"'Albert Sans',sans-serif", boxShadow:'0 4px 14px rgba(99,102,241,0.35)', marginBottom:'0.65rem' }}>
              {saving?'Saving…':'Set PIN & Go to Login'}
            </button>
            <button onClick={()=>navigate('/auth/student')} style={{ background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.38)', fontSize:'0.72rem', fontWeight:600, fontFamily:"'Albert Sans',sans-serif", padding:'0.35rem' }}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </GlassLayout>
  )

  return (
    <GlassLayout>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
        <div style={{ width:'90vw', maxWidth:'400px', borderRadius:'22px', background:'rgba(255,255,255,0.09)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.16)', boxShadow:'0 12px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)', overflow:'hidden', animation:'fadeUp 0.35s ease' }}>
          <div style={{ padding:'2.25rem 1.75rem', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' }}>
            <div style={{ width:70, height:70, borderRadius:'50%', background:'rgba(34,197,94,0.1)', border:'2px solid rgba(34,197,94,0.25)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1.1rem', animation:'successPop 0.5s ease' }}><CheckIcon size={34} color="#4ade80" /></div>
            <h2 style={{ color:'#4ade80', fontFamily:"'Albert Sans',sans-serif", fontSize:'1.45rem', fontWeight:800, margin:'0 0 0.35rem' }}>Enrollment Successful</h2>
            <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.8rem', margin:'0 0 1.35rem' }}>Your face is enrolled using ArcFace AI. You can now log in.</p>
            {student&&(
              <div style={{ width:'100%', borderRadius:'11px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.12)', marginBottom:'1.35rem', textAlign:'left' }}>
                {[['Name',student.name],['Matric',student.matric],['Level',student.level],['Course',student.course||student.option]].map(([k,v],i)=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.58rem 0.9rem', background:i%2===0?'rgba(255,255,255,0.05)':'transparent', borderBottom:i<3?'1px solid rgba(255,255,255,0.12)':'none' }}>
                    <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.55)' }}>{k}</span>
                    <span style={{ fontSize:'0.76rem', fontWeight:700, color:'#fff' }}>{v||'—'}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={()=>setPinStep(true)} style={{ width:'100%', padding:'0.88rem', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', fontWeight:700, fontSize:'0.92rem', cursor:'pointer', fontFamily:"'Albert Sans',sans-serif", boxShadow:'0 4px 14px rgba(99,102,241,0.32)', marginBottom:'0.55rem' }}>Set Up PIN & Continue</button>
            <button onClick={()=>navigate('/auth/student')} style={{ width:'100%', padding:'0.82rem', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)', fontWeight:600, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'Albert Sans',sans-serif", marginBottom:'0.65rem' }}>Skip — Go to Login</button>
            <button onClick={()=>navigate('/')} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:99, cursor:'pointer', padding:'0.4rem 0.9rem', display:'inline-flex', alignItems:'center', gap:'0.4rem', color:'rgba(255,255,255,0.55)', fontSize:'0.74rem', fontWeight:600, fontFamily:"'Albert Sans',sans-serif", transition:'all 0.18s ease' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.12)';e.currentTarget.style.color='#fff'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.color='rgba(255,255,255,0.55)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{width:13,height:13}}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </GlassLayout>
  )
}

// ── Failed ────────────────────────────────────────────────────────
export function EnrollFailed() {
  const navigate=useNavigate()
  return (
    <GlassLayout>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
        <div style={{ width:'90vw', maxWidth:'400px', borderRadius:'22px', background:'rgba(255,255,255,0.09)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.16)', boxShadow:'0 12px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)', overflow:'hidden' }}>
          <div style={{ padding:'2.25rem 1.75rem', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' }}>
            <div style={{ width:70, height:70, borderRadius:'50%', background:'rgba(239,68,68,0.07)', border:'2px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1.1rem' }}><XIcon size={32} color="#ef4444" /></div>
            <h2 style={{ color:'#f87171', fontFamily:"'Albert Sans',sans-serif", fontSize:'1.45rem', fontWeight:800, margin:'0 0 0.35rem' }}>Enrollment Failed</h2>
            <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.8rem', margin:'0 0 1.35rem' }}>We could not save your enrollment. Please try again.</p>
            <div style={{ width:'100%', background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:'11px', padding:'0.9rem 1.1rem', textAlign:'left', marginBottom:'1.35rem' }}>
              <p style={{ fontSize:'0.68rem', fontWeight:700, color:'#dc2626', margin:'0 0 0.55rem', letterSpacing:'0.06em', textTransform:'uppercase' }}>Possible Reasons</p>
              {['Poor or uneven lighting','Face not clearly visible in frame','Network error during save','Face AI server unavailable'].map(r=>(
                <div key={r} style={{ display:'flex', alignItems:'center', gap:'0.45rem', marginBottom:'0.38rem' }}>
                  <div style={{ width:4, height:4, borderRadius:'50%', background:'#dc2626', flexShrink:0, opacity:0.5 }} />
                  <p style={{ margin:0, fontSize:'0.74rem', color:'rgba(255,255,255,0.55)' }}>{r}</p>
                </div>
              ))}
            </div>
            <button onClick={()=>navigate('/auth/enroll')} style={{ width:'100%', padding:'0.88rem', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontWeight:700, fontSize:'0.92rem', cursor:'pointer', fontFamily:"'Albert Sans',sans-serif", boxShadow:'0 4px 14px rgba(239,68,68,0.3)', marginBottom:'0.65rem' }}>Try Again</button>
            <button onClick={()=>navigate('/')} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:99, cursor:'pointer', padding:'0.4rem 0.9rem', display:'inline-flex', alignItems:'center', gap:'0.4rem', color:'rgba(255,255,255,0.55)', fontSize:'0.74rem', fontWeight:600, fontFamily:"'Albert Sans',sans-serif", transition:'all 0.18s ease' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.12)';e.currentTarget.style.color='#fff'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.color='rgba(255,255,255,0.55)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{width:13,height:13}}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </GlassLayout>
  )
}