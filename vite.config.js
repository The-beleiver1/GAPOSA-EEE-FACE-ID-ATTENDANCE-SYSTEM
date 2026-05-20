import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const get = k => env[k] || process.env[k] || ''

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL':        JSON.stringify(get('VITE_SUPABASE_URL')),
      'import.meta.env.VITE_SUPABASE_ANON_KEY':   JSON.stringify(get('VITE_SUPABASE_ANON_KEY')),
      'import.meta.env.VITE_FACE_SERVER_URL':      JSON.stringify(get('VITE_FACE_SERVER_URL') || 'http://localhost:8000'),
      'import.meta.env.VITE_BREVO_API_KEY':        JSON.stringify(get('VITE_BREVO_API_KEY')),
      'import.meta.env.VITE_BREVO_SENDER_EMAIL':   JSON.stringify(get('VITE_BREVO_SENDER_EMAIL')),
      'import.meta.env.VITE_BREVO_SENDER_NAME':    JSON.stringify(get('VITE_BREVO_SENDER_NAME')),
      'import.meta.env.VITE_EMAILJS_SERVICE_ID':   JSON.stringify(get('VITE_EMAILJS_SERVICE_ID')),
      'import.meta.env.VITE_EMAILJS_TEMPLATE_ID':  JSON.stringify(get('VITE_EMAILJS_TEMPLATE_ID')),
      'import.meta.env.VITE_EMAILJS_PUBLIC_KEY':   JSON.stringify(get('VITE_EMAILJS_PUBLIC_KEY')),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-charts':   ['recharts'],
            'vendor-xlsx':     ['xlsx'],
            'vendor-face':     ['face-api.js'],
            'vendor-bcrypt':   ['bcryptjs'],
          },
        },
      },
    },
  }
})
