/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6f7f0',
          100: '#ccefdf',
          200: '#99dec0',
          300: '#6FCF97',
          400: '#4aba8a',
          500: '#2FA084',
          600: '#268a70',
          700: '#1F6F5F',
          800: '#165147',
          900: '#0d3530',
        },
        success: '#16a34a',
        danger:  '#dc2626',
        warning: '#d97706',
        muted:   '#5B5B5B',
      },
      fontFamily: {
        sans: ['Albert Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)',
        modal: '0 20px 60px rgba(0,0,0,.15)',
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.5rem',
      },
    },
  },
  plugins: [],
}
