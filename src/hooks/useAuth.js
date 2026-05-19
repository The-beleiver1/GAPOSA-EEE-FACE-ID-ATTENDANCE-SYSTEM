import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { getUserProfile } from '@/services/authService'

export function useAuth() {
  const { user, role, profile, loading, setUser, setRole, setProfile, setLoading, logout } = useAuthStore()

  useEffect(() => {
    async function handleSession(session) {
      if (session?.user && !session.user.is_anonymous) {
        // Named session — lecturer or admin
        setUser({ uid: session.user.id, email: session.user.email })
        const p = await getUserProfile(session.user.id)
        if (p) { setProfile(p); setRole(p.role) }
      } else if (!session?.user) {
        // No session at all — clear store
        logout()
      }
      // Anonymous sessions (students) — leave store untouched
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, role, profile, loading }
}
