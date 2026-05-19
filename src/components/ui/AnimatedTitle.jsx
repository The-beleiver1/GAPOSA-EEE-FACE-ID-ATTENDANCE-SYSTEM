import { useState, useEffect, useRef } from 'react'

// Sequence per cycle (~9s):
// 1. Fully visible (3s)
// 2. Erase letters right→left while drifting left (~1s)
// 3. Hidden — instantly reposition to the right
// 4. Type letters back in while sliding in from right (~1s)
// 5. Repeat
export function AnimatedTitle({ text, style }) {
  const [chars,   setChars]   = useState(text.length)
  const [xOffset, setXOffset] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const [trans,   setTrans]   = useState('none')
  const timer    = useRef(null)
  const interval = useRef(null)

  useEffect(() => {
    function clear() {
      clearTimeout(timer.current)
      clearInterval(interval.current)
    }

    function cycle() {
      clear()

      // ── 1. Fully visible ────────────────────────────────────────
      setChars(text.length)
      setXOffset(0)
      setOpacity(1)
      setTrans('transform 0.9s ease-in, opacity 0.3s ease')

      timer.current = setTimeout(() => {

        // ── 2. Erase + drift left ───────────────────────────────────
        setXOffset(-38)   // drift 38px left while erasing

        let c = text.length
        interval.current = setInterval(() => {
          c--
          setChars(Math.max(0, c))
          if (c <= 0) {
            clearInterval(interval.current)
            setOpacity(0)

            timer.current = setTimeout(() => {
              // ── 3. Jump to right, hidden (no transition) ────────────
              setTrans('none')
              setXOffset(38)
              setChars(0)

              // Double RAF ensures browser paints step 3 before step 4 starts
              requestAnimationFrame(() => requestAnimationFrame(() => {

                // ── 4. Type in + slide from right ─────────────────────
                setTrans('transform 1.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease')
                setXOffset(0)
                setOpacity(1)

                let i = 0
                interval.current = setInterval(() => {
                  i++
                  setChars(i)
                  if (i >= text.length) {
                    clearInterval(interval.current)
                    timer.current = setTimeout(cycle, 3000)
                  }
                }, 72)
              }))
            }, 340)
          }
        }, 68) // erase one letter every 68ms

      }, 3000) // stay visible 3s before erasing
    }

    cycle()
    return clear
  }, [text])

  return (
    <h1 style={{
      ...style,
      transform:  `translateX(${xOffset}px) translateZ(0)`,
      opacity,
      transition: trans,
      display:    'inline-block',
      whiteSpace: 'nowrap',
      minHeight:  '1em',
      willChange: 'transform, opacity',
      isolation:  'isolate',
    }}>
      {text.slice(0, chars) || '​'}
    </h1>
  )
}
