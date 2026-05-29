import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { signOut } from '@/services/authService'

export function useAutoLogout() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const timerRef = useRef(null)

  useEffect(() => {
    const raw = localStorage.getItem('autoLogoutMinutes') || 'off'
    if (raw === 'off' || raw === '0') return
    const ms = parseInt(raw) * 60 * 1000
    if (isNaN(ms) || ms <= 0) return

    function reset() {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        await signOut().catch(() => {})
        logout()
        navigate('/')
      }, ms)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [navigate, logout])
}
