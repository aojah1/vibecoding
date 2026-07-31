/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fuel: {
          amber: '#F59E0B',
          orange: '#EA580C',
          green: '#10B981',
          blue: '#3B82F6',
          dark: '#0F172A',
          panel: '#1E293B',
          card: '#334155',
        },
      },
    },
  },
  plugins: [],
}
