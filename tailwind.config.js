/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeInUp 0.5s cubic-bezier(0.2, 0.9, 0.4, 1) forwards',
        'fade-scale': 'fadeInScale 0.4s cubic-bezier(0.2, 0.9, 0.4, 1) forwards',
        'slide-left': 'slideInLeft 0.4s cubic-bezier(0.2, 0.9, 0.4, 1) forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'rain': 'rainLine 12s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.8' },
        },
        rainLine: {
          '0%': { transform: 'translateY(-20vh) translateX(0px)', opacity: '0' },
          '10%': { opacity: '0.3' },
          '90%': { opacity: '0.15' },
          '100%': { transform: 'translateY(100vh) translateX(15px)', opacity: '0' },
        },
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'premium': '0 8px 28px var(--shadow), 0 0 0 1px var(--accent-glow)',
      },
    },
  },
  plugins: [],
}