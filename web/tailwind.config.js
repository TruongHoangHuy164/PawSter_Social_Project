/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2b1b22',
          accent: '#ff79b0'
        },
        surface: {
          DEFAULT: '#fff6fb',
          muted: '#fff0f6'
        },
        glass: 'rgba(255,255,255,0.04)'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
