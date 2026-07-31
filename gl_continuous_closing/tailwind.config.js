/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        oracle: {
          red: '#C74634',
          redlight: '#e8573e',
          dark: '#1A1A2E',
          navy: '#16213E',
          blue: '#0F3460',
        },
      },
    },
  },
  plugins: [],
}

