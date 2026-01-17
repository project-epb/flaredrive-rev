import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default <Config>{
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './app/**/*.{vue,js,ts}', 
  ],
  darkMode: 'class', 
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
          DEFAULT: 'var(--color-primary-500)',
        },
        success: { 500: '#22c55e', DEFAULT: '#22c55e' }, // green-500
        error: { 500: '#ef4444', DEFAULT: '#ef4444' },   // red-500
        warning: { 500: '#f59e0b', DEFAULT: '#f59e0b' }, // amber-500
        info: { 500: '#3b82f6', DEFAULT: '#3b82f6' },    // blue-500
      }
    }
  },
  plugins: [
    typography,
  ],
}
