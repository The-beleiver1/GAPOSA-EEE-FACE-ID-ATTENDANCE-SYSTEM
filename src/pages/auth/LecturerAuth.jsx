import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { lecturerLogin, lecturerRegister, resetPassword, generateLecturerInvite } from "@/services/authService";
import { sendLecturerInviteEmail, emailJsConfigured } from "@/services/emailService";
import { getCourses } from "@/services/courseService";
import logo from "../../assets/gaposa-logo.png";
import img1 from "@/assets/electric-pole-foggy-day.jpg";
import img2 from "@/assets/warm-filament-bulbs-cast-cozy-amber-glow-dimly-lit-room.jpg";
import img3 from "@/assets/sun-setting-silhouette-electricity-pylons.jpg";

const SLIDES = [img1, img2, img3];
const RESEND_SECONDS = 60;

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width:19,height:19 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width:19,height:19 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
  </svg>
);
const CheckboxIcon = ({ checked }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.2} style={{ width:18,height:18,flexShrink:0 }}>
    {checked
      ? <><rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#2FA084" stroke="#2FA084"/><path strokeLinecap="round" strokeLinejoin="round" stroke="#fff" strokeWidth={2.5} d="M7 12l4 4 6-6"/></>
      : <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="rgba(255,255,255,0.35)" strokeWidth={2}/>
    }
  </svg>
);
const SpinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ width:15,height:15,animation:'spinIcon 0.9s linear infinite' }}>
    <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width:16,height:16 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
  </svg>
);
const CheckCircleIcon = ({ color="#6FCF97" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} style={{ width:15,height:15,flexShrink:0 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);
const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.8} style={{ width:16,height:16 }}>
    <circle cx="8.5" cy="15.5" r="4.5"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 15.5h7M17.5 15.5V18M20 15.5V17"/>
  </svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} style={{ width:14,height:14 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.9} style={{ width:15,height:15 }}>
    <circle cx="11" cy="11" r="7"/>
    <path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ width:14,height:14 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
  </svg>
);

export default function LecturerAuth() {
  const navigate = useNavigate();
  const [tab, setTab]           = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle]       = useState("");
  const [authCode, setAuthCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState("");
  const [active, setActive]     = useState(0);

  const [courses, setCourses]           = useState([]);
  const [selectedCourses, setSelected]  = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");

  const [codeSent, setCodeSent]         = useState(false);
  const [codeLoading, setCodeLoading]   = useState(false);
  const [resendTimer, setResendTimer]   = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const iv = setInterval(() => setActive(s => (s + 1) % SLIDES.length), 4500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (tab === "register" && courses.length === 0) {
      setCoursesLoading(true);
      getCourses()
        .then(list => { list.sort((a,b)=>(a.code||'').localeCompare(b.code||'')); setCourses(list); })
        .catch(() => {})
        .finally(() => setCoursesLoading(false));
    }
  }, [tab]);

  useEffect(() => {
    if (resendTimer <= 0) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setResendTimer(t => { if (t <= 1) clearInterval(timerRef.current); return t - 1; }), 1000);
    return () => clearInterval(timerRef.current);
  }, [resendTimer]);

  function switchTab(t) { setTab(t); setError(""); setInfo(""); setCodeSent(false); setResendTimer(0); }
  function toggleCourse(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  async function handleSendCode() {
    if (!email) { setError("Enter your email address first."); return; }
    setError(""); setCodeLoading(true);
    try {
      const code = await generateLecturerInvite(email);
      const emailed = await sendLecturerInviteEmail(email, code);
      setCodeSent(true);
      setResendTimer(RESEND_SECONDS);
      if (emailed) {
        setInfo(`Authorization code sent to ${email}. Check your inbox (and spam folder).`);
      } else {
        setInfo(`Code generated: ${code} — EmailJS not configured, share this manually.`);
      }
    } catch (err) {
      setError(err.message || "Failed to generate code. Try again.");
    } finally { setCodeLoading(false); }
  }

  async function handleLogin(e) {
    e.preventDefault(); setError(""); setInfo(""); setLoading(true);
    try { await lecturerLogin(email, password); navigate("/lecturer"); }
    catch (err) { setError(err.message.replace("AuthApiError: ", "")); }
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault(); setError(""); setInfo("");
    if (!title) { setError("Select your title."); return; }
    if (!fullName.trim()) { setError("Enter your full name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!authCode.trim()) { setError("Enter the authorization code sent to your email."); return; }
    if (selectedCourses.length === 0) { setError("Select at least one assigned course."); return; }
    setLoading(true);
    try {
      await lecturerRegister({ name: `${title} ${fullName}`.trim(), email, password, secretCode: authCode, courses: selectedCourses });
      setInfo("Registration submitted! Await admin approval — you'll be able to log in once approved.");
      setTab("login"); setError("");
    } catch (err) { setError(err.message.replace("AuthApiError: ", "")); }
    finally { setLoading(false); }
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address first."); return; }
    setError(""); setInfo("");
    try { await resetPassword(email); setInfo("Password reset link sent — check your inbox."); }
    catch { setError("Could not send reset email. Check the address and try again."); }
  }

  const filteredCourses = courses.filter(c =>
    `${c.code} ${c.title}`.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const inp = {
    width:"100%", padding:"0.85rem 1rem", borderRadius:"10px",
    background:"rgba(255,255,255,0.07)", border:"1.5px solid rgba(255,255,255,0.13)",
    color:"#fff", fontSize:"0.92rem", outline:"none", boxSizing:"border-box",
    fontFamily:"'Albert Sans',sans-serif", transition:"border-color 0.2s",
  };
  const lbl = {
    display:"block", color:"rgba(255,255,255,0.88)", fontSize:"0.73rem",
    fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"0.45rem",
  };

  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Albert Sans',sans-serif", background:"#0d3d2e" }}>

      {SLIDES.map((src, i) => (
        <div key={i} style={{ position:"absolute", inset:0, backgroundImage:`url(${src})`, backgroundSize:"cover", backgroundPosition:"center", opacity:i===active?1:0, zIndex:i===active?1:0, transition:"opacity 1.2s ease" }}/>
      ))}
      <div style={{ position:"absolute", inset:0, zIndex:2, background:"linear-gradient(135deg, rgba(31,111,95,0.82) 0%, rgba(47,160,132,0.65) 50%, rgba(31,111,95,0.88) 100%)" }}/>

      {/* Glass card */}
      <div style={{
        position:"relative", zIndex:10, width:"90vw", maxWidth:"480px",
        borderRadius:"24px", background:"rgba(255,255,255,0.09)",
        backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
        border:"1px solid rgba(255,255,255,0.16)",
        boxShadow:"0 12px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)",
        overflow:"hidden", maxHeight:"94vh", display:"flex", flexDirection:"column",
      }}>

        {/* Accent bar */}
        <div style={{ height:4, background:"linear-gradient(90deg,#1F6F5F,#2FA084,#6FCF97,#2FA084,#1F6F5F)", backgroundSize:"300% 100%", animation:"shimmerBar 4s linear infinite", flexShrink:0 }}/>

        {/* Header */}
        <div style={{ padding:"1.2rem 1.6rem 0.9rem", display:"flex", alignItems:"center", gap:"0.9rem", flexShrink:0 }}>
          <div style={{ width:52, height:52, borderRadius:"14px", background:"#fff", border:"1px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", padding:"6px", overflow:"hidden", flexShrink:0, boxShadow:"0 6px 20px rgba(0,0,0,0.3)" }}>
            <img src={logo} alt="GAPOSA" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
          </div>
          <div>
            <p style={{ margin:0, fontWeight:900, color:"#fff", fontSize:"1.05rem", letterSpacing:"0.04em", lineHeight:1.15 }}>EEE FACE-ID</p>
            <p style={{ margin:"0.1rem 0 0", fontSize:"0.63rem", color:"rgba(255,255,255,0.68)", fontWeight:500, lineHeight:1.3 }}>Face Recognition Attendance System</p>
            <p style={{ margin:"0.1rem 0 0", fontSize:"0.68rem", color:"#6FCF97", fontWeight:700 }}>Gateway ICT Polytechnic</p>
            <p style={{ margin:"0.04rem 0 0", fontSize:"0.6rem", color:"rgba(255,255,255,0.78)", fontWeight:500 }}>Electrical/Electronics Engineering Dept.</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ position:"relative", display:"flex", background:"rgba(255,255,255,0.07)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderRadius:16, padding:4, margin:"0 1.6rem 0.9rem", border:"1px solid rgba(255,255,255,0.10)", flexShrink:0 }}>
          <div style={{
            position:"absolute", top:4, bottom:4,
            width:"calc(50% - 4px)",
            left: tab==="login" ? "4px" : "calc(50%)",
            borderRadius:12, background:"rgba(255,255,255,0.97)",
            boxShadow:"0 2px 12px rgba(0,0,0,0.18)",
            transition:"left 0.38s cubic-bezier(0.34,1.15,0.64,1)",
          }}/>
          {[["login","Login"],["register","Register"]].map(([t,label]) => (
            <button key={t} onClick={() => switchTab(t)}
              style={{ flex:1, padding:"0.68rem 0.5rem", border:"none", background:"transparent", fontWeight:700, fontSize:"0.87rem", cursor:"pointer", position:"relative", zIndex:1, color:tab===t?"#111827":"rgba(255,255,255,0.78)", transition:"color 0.28s ease", fontFamily:"'Albert Sans',sans-serif", letterSpacing:"0.02em" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable form */}
        <div style={{ overflowY:"auto", flex:1 }}>
          <div style={{ padding:"0.25rem 1.6rem 1.5rem" }}>

            {error && (
              <div style={{ background:"rgba(220,38,38,0.18)", border:"1.5px solid rgba(239,68,68,0.65)", borderRadius:"10px", padding:"0.7rem 0.9rem", marginBottom:"1rem", display:"flex", alignItems:"flex-start", gap:"0.5rem" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ width:16,height:16,flexShrink:0,marginTop:1 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                <p style={{ margin:0, fontSize:"0.8rem", color:"#fff", lineHeight:1.5, fontWeight:500 }}>{error}</p>
              </div>
            )}
            {info && (
              <div style={{ background:"rgba(47,160,132,0.15)", border:"1.5px solid rgba(47,160,132,0.45)", borderRadius:"10px", padding:"0.7rem 0.9rem", marginBottom:"1rem", display:"flex", alignItems:"flex-start", gap:"0.5rem" }}>
                <CheckCircleIcon color="#6FCF97"/>
                <p style={{ margin:0, fontSize:"0.8rem", color:"#fff", lineHeight:1.5, fontWeight:500 }}>{info}</p>
              </div>
            )}

            {tab === "login" ? (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom:"1.1rem" }}>
                  <label style={lbl}>Email Address</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@school.edu.ng" required style={inp}/>
                </div>
                <div style={{ marginBottom:"0.6rem" }}>
                  <label style={lbl}>Password</label>
                  <div style={{ position:"relative" }}>
                    <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={{ ...inp, paddingRight:"3rem" }}/>
                    <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:"0.9rem", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:"8px", color:"rgba(255,255,255,0.88)", cursor:"pointer", display:"flex", alignItems:"center", padding:"0.32rem", zIndex:1 }}>
                      {showPass?<EyeOffIcon/>:<EyeIcon/>}
                    </button>
                  </div>
                </div>
                <div style={{ textAlign:"right", marginBottom:"1.5rem" }}>
                  <button type="button" onClick={handleForgotPassword} style={{ background:"none", border:"none", color:"#fff", fontSize:"0.8rem", cursor:"pointer", fontWeight:600, fontFamily:"'Albert Sans',sans-serif", textDecoration:"underline", textUnderlineOffset:"2px", textDecorationColor:"rgba(255,255,255,0.45)" }}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  style={{ width:"100%", padding:"1rem", borderRadius:"12px", border:"none", background:loading?"rgba(47,160,132,0.35)":"linear-gradient(135deg,#2FA084,#1F6F5F)", color:loading?"rgba(255,255,255,0.5)":"#fff", fontWeight:800, fontSize:"1rem", cursor:loading?"not-allowed":"pointer", fontFamily:"'Albert Sans',sans-serif", letterSpacing:"0.04em", boxShadow:loading?"none":"0 6px 20px rgba(47,160,132,0.4)", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem", transition:"all 0.2s" }}>
                  {loading?<><SpinIcon/>Signing in…</>:"Login"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>

                <div style={{ display:"flex", alignItems:"flex-start", gap:"0.7rem", marginBottom:"1.2rem", padding:"0.85rem 1rem", borderRadius:12, background:"rgba(47,160,132,0.12)", border:"1.5px solid rgba(47,160,132,0.35)" }}>
                  <div style={{ width:30,height:30,borderRadius:"50%",background:"#2FA084",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                    <InfoIcon/>
                  </div>
                  <p style={{ margin:0,fontSize:"0.8rem",color:"rgba(255,255,255,0.88)",lineHeight:1.6,fontWeight:500 }}>
                    Enter your email below, click <strong style={{ color:"#6FCF97" }}>Send Code</strong>, then check your inbox for the authorization code before registering.
                  </p>
                </div>

                <div style={{ display:"flex", gap:"0.6rem", marginBottom:"1rem", alignItems:"flex-end" }}>
                  <div style={{ flexShrink:0, width:"130px" }}>
                    <label style={lbl}>Title</label>
                    <select value={title} onChange={e=>setTitle(e.target.value)} required
                      style={{ ...inp, cursor:"pointer", appearance:"none", WebkitAppearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 0.75rem center", backgroundSize:"1rem", paddingRight:"2.2rem", color: title ? "#fff" : "rgba(255,255,255,0.45)" }}>
                      <option value="" disabled>Title</option>
                      <option>Mr.</option>
                      <option>Mrs.</option>
                      <option>Ms.</option>
                      <option>Dr.</option>
                      <option>Engr.</option>
                      <option>Prof.</option>
                      <option>Rev.</option>
                      <option>Barr.</option>
                    </select>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={lbl}>Full Name</label>
                    <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="John Adeyemi" required style={inp}/>
                  </div>
                </div>

                <div style={{ marginBottom:"1rem" }}>
                  <label style={lbl}>Email Address</label>
                  <div style={{ display:"flex", gap:"0.5rem", alignItems:"stretch" }}>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@school.edu.ng" required style={{ ...inp, flex:1 }}/>
                    <button type="button" onClick={handleSendCode} disabled={codeLoading||resendTimer>0}
                      style={{ flexShrink:0, padding:"0 1rem", borderRadius:10, border:"1.5px solid rgba(111,207,151,0.6)", background:codeSent?"rgba(111,207,151,0.12)":"rgba(47,160,132,0.7)", color:"#fff", fontWeight:700, fontSize:"0.75rem", cursor:(codeLoading||resendTimer>0)?"not-allowed":"pointer", fontFamily:"'Albert Sans',sans-serif", display:"flex", alignItems:"center", gap:"0.4rem", whiteSpace:"nowrap", opacity:(codeLoading||resendTimer>0)?0.6:1, transition:"all 0.2s", minWidth:100 }}>
                      {codeLoading ? <><SpinIcon/>Sending…</> : codeSent && resendTimer>0 ? <><CheckCircleIcon color="#6FCF97"/>{resendTimer}s</> : <><MailIcon/>{codeSent?"Resend":"Send Code"}</>}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom:"1rem" }}>
                  <label style={lbl}>Password</label>
                  <div style={{ position:"relative" }}>
                    <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 6 characters" required style={{ ...inp, paddingRight:"3rem" }}/>
                    <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:"0.9rem", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:"8px", color:"rgba(255,255,255,0.88)", cursor:"pointer", display:"flex", alignItems:"center", padding:"0.32rem", zIndex:1 }}>
                      {showPass?<EyeOffIcon/>:<EyeIcon/>}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom:"1rem" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.45rem" }}>
                    <label style={{ ...lbl, marginBottom:0 }}>Authorization Code</label>
                    {codeSent && <span style={{ fontSize:"0.7rem", color:"#6FCF97", fontWeight:600, display:"flex", alignItems:"center", gap:"0.3rem" }}><CheckCircleIcon color="#6FCF97"/>Code sent</span>}
                  </div>
                  <p style={{ margin:"0 0 0.5rem", fontSize:"0.74rem", color:"rgba(255,255,255,0.72)", lineHeight:1.5 }}>
                    {codeSent ? "Check your email inbox. Also check spam folder." : "Click 'Send Code' above first to receive your code."}
                  </p>
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:"0.9rem", top:"50%", transform:"translateY(-50%)" }}><KeyIcon/></div>
                    <input type={showCode?"text":"password"} value={authCode} onChange={e=>setAuthCode(e.target.value.toUpperCase())} placeholder="EEE-XXXX-XXXX" required style={{ ...inp, paddingLeft:"2.6rem", paddingRight:"3rem", letterSpacing:"0.1em", fontWeight:700 }}/>
                    <button type="button" onClick={()=>setShowCode(!showCode)} style={{ position:"absolute", right:"0.9rem", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:"8px", color:"rgba(255,255,255,0.88)", cursor:"pointer", display:"flex", alignItems:"center", padding:"0.32rem", zIndex:1 }}>
                      {showCode?<EyeOffIcon/>:<EyeIcon/>}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom:"1.25rem" }}>
                  <label style={lbl}>
                    Assigned Courses
                    {selectedCourses.length > 0 && (
                      <span style={{ marginLeft:"0.4rem", background:"#2FA084", color:"#fff", fontSize:"0.65rem", fontWeight:700, padding:"0.1rem 0.5rem", borderRadius:99, letterSpacing:0, textTransform:"none" }}>
                        {selectedCourses.length} selected
                      </span>
                    )}
                  </label>
                  <div style={{ position:"relative", marginBottom:"0.5rem" }}>
                    <div style={{ position:"absolute", left:"0.9rem", top:"50%", transform:"translateY(-50%)" }}><SearchIcon/></div>
                    <input type="text" value={courseSearch} onChange={e=>setCourseSearch(e.target.value)} placeholder="Search by course code or title…" style={{ ...inp, paddingLeft:"2.6rem", fontSize:"0.85rem" }}/>
                  </div>
                  <div style={{ maxHeight:180, overflowY:"auto", borderRadius:10, border:"1.5px solid rgba(255,255,255,0.13)", background:"rgba(255,255,255,0.04)", overflow:"hidden auto" }}>
                    {coursesLoading ? (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem", padding:"1.2rem", color:"rgba(255,255,255,0.72)", fontSize:"0.82rem" }}>
                        <SpinIcon/> Loading courses…
                      </div>
                    ) : filteredCourses.length === 0 ? (
                      <p style={{ textAlign:"center", color:"rgba(255,255,255,0.55)", fontSize:"0.82rem", padding:"1.2rem" }}>No courses found</p>
                    ) : filteredCourses.map((course, i) => {
                      const sel = selectedCourses.includes(course.id);
                      return (
                        <div key={course.id} onClick={()=>toggleCourse(course.id)}
                          style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.7rem 0.9rem", cursor:"pointer", background:sel?"rgba(47,160,132,0.18)":"transparent", borderBottom:"1px solid rgba(255,255,255,0.06)", transition:"background 0.12s" }}>
                          <CheckboxIcon checked={sel}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontSize:"0.85rem", fontWeight:700, color:sel?"#6FCF97":"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{course.code}</p>
                            <p style={{ margin:0, fontSize:"0.73rem", color:sel?"rgba(111,207,151,0.85)":"rgba(255,255,255,0.65)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{course.title}</p>
                          </div>
                          {sel && <svg viewBox="0 0 24 24" fill="none" stroke="#6FCF97" strokeWidth={2.5} style={{ width:14,height:14,flexShrink:0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  style={{ width:"100%", padding:"1rem", borderRadius:"12px", border:"none", background:loading?"rgba(47,160,132,0.35)":"linear-gradient(135deg,#2FA084,#1F6F5F)", color:loading?"rgba(255,255,255,0.5)":"#fff", fontWeight:900, fontSize:"1rem", cursor:loading?"not-allowed":"pointer", fontFamily:"'Albert Sans',sans-serif", letterSpacing:"0.04em", boxShadow:loading?"none":"0 6px 20px rgba(47,160,132,0.45)", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem", transition:"all 0.2s" }}>
                  {loading?<><SpinIcon/>Registering…</>:"Create Account"}
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Back to Home */}
        <div style={{ padding:"0.75rem 2rem", borderTop:"1px solid rgba(255,255,255,0.1)", display:"flex", justifyContent:"center", flexShrink:0 }}>
          <button onClick={()=>navigate("/")}
            style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:99, cursor:"pointer", padding:"0.5rem 1.2rem", display:"flex", alignItems:"center", gap:"0.45rem", color:"rgba(255,255,255,0.88)", fontSize:"0.82rem", fontWeight:600, fontFamily:"'Albert Sans',sans-serif", transition:"all 0.18s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="rgba(255,255,255,0.28)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";e.currentTarget.style.color="rgba(255,255,255,0.88)";e.currentTarget.style.borderColor="rgba(255,255,255,0.14)";}}>
            <ArrowLeftIcon/> Back to Home
          </button>
        </div>
      </div>

      {/* Slide dots */}
      <div style={{ position:"absolute", bottom:"1.4rem", right:"1.6rem", zIndex:20, display:"flex", gap:"7px", alignItems:"center" }}>
        {SLIDES.map((_,i) => (
          <div key={i} style={{ height:"6px", borderRadius:"99px", background:i===active?"#6FCF97":"rgba(255,255,255,0.35)", width:i===active?"22px":"6px", opacity:i===active?1:0.9, boxShadow:i===active?"0 0 8px rgba(111,207,151,0.7)":"none", transition:"all 0.35s ease" }}/>
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.45); }
        select option { background: #1F6F5F; color: #fff; }
        input:focus, select:focus { border-color: rgba(255,255,255,0.4) !important; outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); }
        ::-webkit-scrollbar-thumb { background: rgba(111,207,151,0.4); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #6FCF97; }
        @keyframes shimmerBar { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spinIcon { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
