import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin, resetPassword } from "@/services/authService";
import logo from "../../assets/gaposa-logo.png";
import img1 from "@/assets/electric-pole-foggy-day.jpg";
import img2 from "@/assets/warm-filament-bulbs-cast-cozy-amber-glow-dimly-lit-room.jpg";
import img3 from "@/assets/sun-setting-silhouette-electricity-pylons.jpg";

const SLIDES = [img1, img2, img3];

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width:18, height:18 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width:18, height:18 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

export default function AdminAuth() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState("");
  const [active, setActive]     = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setActive(s => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(iv);
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setInfo("");
    setLoading(true);
    try {
      await adminLogin(email, password);
      navigate("/admin");
    } catch (err) {
      setError(err.message.replace("AuthApiError: ", ""));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address first."); return; }
    setError(""); setInfo("");
    try {
      await resetPassword(email);
      setInfo("Password reset email sent. Check your inbox.");
    } catch {
      setError("Could not send reset email. Check the address and try again.");
    }
  }

  const inputStyle = {
    width: "100%", padding: "0.8rem 1rem", borderRadius: "12px",
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)",
    color: "#fff", fontSize: "0.88rem", outline: "none", boxSizing: "border-box",
    fontFamily: "'Albert Sans', sans-serif",
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Albert Sans', sans-serif", background: "#0d3d2e" }}>

      {/* Background slides */}
      {SLIDES.map((src, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center", opacity: i === active ? 1 : 0, zIndex: i === active ? 1 : 0, transition: "opacity 1s ease" }} />
      ))}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "linear-gradient(120deg, rgba(31,111,95,0.80) 0%, rgba(31,111,95,0.62) 50%, rgba(31,111,95,0.82) 100%)" }} />

      {/* Card */}
      <div style={{ position: "relative", zIndex: 10, width: "90vw", maxWidth: "480px", borderRadius: "24px", background: "rgba(255,255,255,0.09)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.16)", boxShadow: "0 12px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "1.35rem 1.75rem 1.1rem", display: "flex", alignItems: "center", gap: "0.9rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: "16px", flexShrink: 0, background: "#fff", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: "7px", boxSizing: "border-box", overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.3)" }}>
            <img src={logo} alt="GAPOSA" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 900, color: "#fff", fontSize: "1.05rem", letterSpacing: "0.04em", lineHeight: 1.15 }}>EEE FACE-ID</p>
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.63rem", color: "rgba(255,255,255,0.68)", fontWeight: 500, lineHeight: 1.3 }}>Face Recognition Attendance System</p>
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.68rem", color: "#6FCF97", fontWeight: 700 }}>Gateway ICT Polytechnic</p>
            <p style={{ margin: "0.04rem 0 0", fontSize: "0.6rem", color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>Electrical/Electronics Engineering Dept.</p>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "1.5rem 1.75rem 1.75rem" }}>
          {error && (
            <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "10px", padding: "0.7rem 0.9rem", marginBottom: "1rem", color: "#fca5a5", fontSize: "0.78rem", display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth={2} style={{ width: 14, height: 14, flexShrink: 0, marginTop: "1px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              {error}
            </div>
          )}
          {info && (
            <div style={{ background: "rgba(47,160,132,0.08)", border: "1px solid rgba(47,160,132,0.25)", borderRadius: "10px", padding: "0.7rem 0.9rem", marginBottom: "1rem", color: "#2FA084", fontSize: "0.78rem" }}>{info}</div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.88)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.45rem" }}>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gaposa.edu.ng" required style={inputStyle} />
            </div>

            <div style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.88)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.45rem" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={{ ...inputStyle, paddingRight: "2.8rem" }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.72)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginBottom: "1.35rem" }}>
              <button type="button" onClick={handleForgotPassword} style={{ background: "none", border: "none", color: "#fff", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600, fontFamily: "'Albert Sans', sans-serif", textDecoration: "underline", textUnderlineOffset: "2px", textDecorationColor: "rgba(255,255,255,0.45)" }}>Forgot password?</button>
            </div>

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.88rem", borderRadius: "12px", border: "none", background: loading ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg,#2FA084,#1F6F5F)", color: loading ? "rgba(255,255,255,0.4)" : "#fff", fontWeight: 700, fontSize: "0.92rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Albert Sans', sans-serif", letterSpacing: "0.04em", boxShadow: loading ? "none" : "0 4px 18px rgba(47,160,132,0.40)" }}>
              {loading ? "Verifying…" : "Login"}
            </button>
          </form>
        </div>

        <div style={{ display: "flex", justifyContent: "center", paddingBottom: "1.25rem" }}>
          <button onClick={() => navigate("/")}
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 99, cursor: "pointer", padding: "0.42rem 0.9rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "rgba(255,255,255,0.88)", fontSize: "0.74rem", fontWeight: 600, fontFamily: "'Albert Sans', sans-serif", transition: "all 0.18s ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ width: 13, height: 13 }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            Back to Home
          </button>
        </div>

      </div>

      {/* Slide dots */}
      <div style={{ position: "absolute", bottom: "1.2rem", right: "1.4rem", zIndex: 20, display: "flex", gap: "6px", alignItems: "center" }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{ height: "6px", borderRadius: "99px", background: "#6FCF97", width: i === active ? "20px" : "6px", opacity: i === active ? 1 : 0.35, transition: "all 0.3s ease" }} />
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.48); }
        input:focus { border-color: rgba(255,255,255,0.35) !important; outline: none; }
      `}</style>
    </div>
  );
}
