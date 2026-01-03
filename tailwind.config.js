/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./apps/dashboard/src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#667eea',
          dark: '#5568d3',
        },
        secondary: {
          DEFAULT: '#764ba2',
          dark: '#5e3a82',
        },
      },
    },
  },
  plugins: [],
}
