import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,
      role:    null,   // 'student' | 'lecturer' | 'admin'
      profile: null,   // full profile row from Supabase users table
      loading: true,

      setUser:    (user)    => set({ user }),
      setRole:    (role)    => set({ role }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),

      logout: () => set({ user: null, role: null, profile: null }),

      isAdmin:    () => get().role === 'admin',
      isLecturer: () => get().role === 'lecturer',
      isStudent:  () => get().role === 'student',
    }),
    {
      name: 'gaposa-auth',
      partialize: (state) => ({
        user:    state.user,
        role:    state.role,
        profile: state.profile,
      }),
    }
  )
)
