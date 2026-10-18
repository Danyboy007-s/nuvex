/** @type {import('tailwindcss').Config} */
// Los colores y las animaciones del diseño viven en styles/globals.css como
// variables CSS y clases (.lift, .rise-in, .reveal, .orb-*...), para que el
// modo oscuro solo tenga que cambiar las variables.
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
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
