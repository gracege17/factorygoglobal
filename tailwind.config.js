/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#161616',
        sand: '#f7f5f0',
        moss: '#25544a',
        clay: '#a15a3a',
      },
      boxShadow: {
        soft: '0 12px 30px -12px rgba(22, 22, 22, 0.22)',
      },
    },
  },
  plugins: [],
}
