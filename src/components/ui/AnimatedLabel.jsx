import { useState, useEffect, useRef } from 'react'

export function AnimatedLabel({ text, Icon, iconSize = 22, color = '#2FA084' }) {
  const [chars,   setChars]   = useState(text.length)
  const [xOffset, setXOffset] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const [trans,   setTrans]   = useState('none')
  const timerRef = useRef(null)
  const ivRef    = useRef(null)

  useEffect(() => {
    function clear() { clearTimeout(timerRef.current); clearInterval(ivRef.current) }
    function cycle() {
      clear()
      setChars(text.length); setXOffset(0); setOpacity(1)
      setTrans('transform 1.2s ease-in, opacity 0.5s ease')
      timerRef.current = setTimeout(() => {
        setXOffset(-38)
        let c = text.length
        ivRef.current = setInterval(() => {
          if (c > 0) { c--; setChars(c) }
          if (c <= 0) {
            clearInterval(ivRef.current); setOpacity(0)
            timerRef.current = setTimeout(() => {
              setTrans('none'); setXOffset(38); setChars(0)
              requestAnimationFrame(() => requestAnimationFrame(() => {
                setTrans('transform 1.8s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease')
                setXOffset(0); setOpacity(1)
                let ci = 0
                ivRef.current = setInterval(() => {
                  if (ci < text.length) { ci++; setChars(ci) }
                  if (ci >= text.length) {
                    clearInterval(ivRef.current)
                    timerRef.current = setTimeout(cycle, 4000)
                  }
                }, 95)
              }))
            }, 440)
          }
        }, 95)
      }, 4200)
    }
    cycle()
    return clear
  }, [text])

  return (
    <div style={{ overflow: 'hidden' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
        transform: `translateX(${xOffset}px) translateZ(0)`,
        opacity, transition: trans, willChange: 'transform, opacity',
      }}>
        {Icon && <Icon size={iconSize} color={color} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
        <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', lineHeight: 1 }}>
          {text.slice(0, chars) || '​'}
        </p>
      </div>
    </div>
  )
}
