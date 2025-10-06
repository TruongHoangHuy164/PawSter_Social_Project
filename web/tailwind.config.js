/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#101010',
          accent: '#8645ff'
        }
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
