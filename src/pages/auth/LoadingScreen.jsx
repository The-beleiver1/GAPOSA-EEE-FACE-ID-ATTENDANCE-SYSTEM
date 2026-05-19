import { useEffect, useState } from "react";
import img1 from "../../assets/electric-pole-foggy-day.jpg";
import img2 from "../../assets/warm-filament-bulbs-cast-cozy-amber-glow-dimly-lit-room.jpg";
import img3 from "../../assets/sun-setting-silhouette-electricity-pylons.jpg";
import logo from "../../assets/gaposa-logo.png";

const SLIDES = [img1, img2, img3];

export default function LoadingScreen({ progress, message }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [prevSlide, setPrevSlide]     = useState(null);

  useEffect(() => {
    const iv = setInterval(() => {
      setPrevSlide(activeSlide);
      setActiveSlide((s) => (s + 1) % SLIDES.length);
      setTimeout(() => setPrevSlide(null), 900);
    }, 1800);
    return () => clearInterval(iv);
  }, [activeSlide]);

  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Albert Sans', sans-serif" }}>

      {/* Sliding backgrounds */}
      {SLIDES.map((src, i) => (
        <div key={i} style={{
          position:"absolute", inset:0,
          backgroundImage:`url(${src})`,
          backgroundSize:"cover", backgroundPosition:"center",
          opacity: i === activeSlide ? 1 : i === prevSlide ? 0 : 0,
          zIndex: i === activeSlide ? 1 : i === prevSlide ? 0 : -1,
          transition:"opacity 0.9s ease",
        }} />
      ))}

      {/* Dark overlay */}
      <div style={{ position:"absolute", inset:0, zIndex:2, background:"linear-gradient(to bottom, rgba(31,111,95,0.55) 0%, rgba(31,111,95,0.72) 60%, rgba(31,111,95,0.88) 100%)" }} />

      {/* Glass card */}
      <div style={{
        position:"relative", zIndex:10,
        display:"flex", flexDirection:"column", alignItems:"center",
        padding:"2.5rem 3rem", borderRadius:"24px",
        background:"rgba(255,255,255,0.08)",
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        border:"1px solid rgba(255,255,255,0.18)",
        boxShadow:"0 8px 48px rgba(0,0,0,0.45)",
        minWidth:"320px", maxWidth:"420px", width:"90vw",
      }}>

        {/* GAPOSA logo */}
        <div style={{
          width:"72px", height:"72px", borderRadius:"18px",
          background:"#ffffff",
          display:"flex", alignItems:"center", justifyContent:"center",
          marginBottom:"1.25rem",
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
          padding:"6px", boxSizing:"border-box",
          overflow:"hidden",
        }}>
          <img
            src={logo}
            alt="GAPOSA"
            style={{ width:"100%", height:"100%", objectFit:"contain" }}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.style.background = "linear-gradient(135deg, #f59e0b, #ef4444)";
              e.target.parentElement.innerHTML = `<svg viewBox="0 0 40 40" fill="none" style="width:36px;height:36px"><polygon points="22,4 10,22 20,22 18,36 30,18 20,18" fill="white"/></svg>`;
            }}
          />
        </div>

        {/* Title */}
        <h1 style={{ fontFamily:"'Albert Sans', sans-serif", fontSize:"2rem", fontWeight:700, color:"#ffffff", margin:0, letterSpacing:"0.06em" }}>
          EEE FACE-ID
        </h1>

        {/* Subtitle row 1 */}
        <p style={{ fontSize:"0.62rem", color:"rgba(255,255,255,0.5)", letterSpacing:"0.14em", textTransform:"uppercase", margin:"0.3rem 0 0", fontWeight:400 }}>
          Face Recognition Attendance System
        </p>

        {/* Subtitle row 2 — institution name */}
        <p style={{ fontSize:"0.7rem", color:"#6FCF97", letterSpacing:"0.04em", margin:"0.2rem 0 1.75rem", fontWeight:500, textAlign:"center", lineHeight:1.4 }}>
          Gateway ICT Polytechnic, Saapade
        </p>

        {/* Progress bar */}
        <div style={{ width:"100%", height:"4px", borderRadius:"99px", background:"rgba(255,255,255,0.12)", overflow:"hidden", marginBottom:"0.85rem" }}>
          <div style={{
            height:"100%", borderRadius:"99px",
            background:"linear-gradient(90deg, #2FA084, #6FCF97)",
            width:`${progress}%`,
            transition:"width 0.6s ease",
            boxShadow:"0 0 10px rgba(47,160,132,0.5)",
          }} />
        </div>

        {/* Status message */}
        <p style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.55)", margin:0, minHeight:"1.1em", letterSpacing:"0.02em" }}>
          {message}
        </p>

        {/* Slide dots */}
        <div style={{ display:"flex", gap:"6px", marginTop:"1.5rem" }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width:"6px", height:"6px", borderRadius:"50%", background:"#2FA084",
              opacity: i === activeSlide ? 1 : 0.35,
              transform: i === activeSlide ? "scale(1.4)" : "scale(1)",
              transition:"all 0.3s ease",
            }} />
          ))}
        </div>
      </div>

      {/* Bottom credit */}
      <p style={{ position:"absolute", bottom:"1.5rem", zIndex:10, color:"rgba(255,255,255,0.25)", fontSize:"0.7rem", letterSpacing:"0.04em", margin:0, textAlign:"center" }}>
        Gateway ICT Polytechnic Saapade · EEE Department
      </p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Albert Sans:wght@300;400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}