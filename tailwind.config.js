/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        judul: ['var(--font-judul)', 'serif'],
        subjudul: ['var(--font-sub-judul)', 'sans-serif'],
        deskripsi: ['var(--font-deskripsi)', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0f4d39', // The Lodge Maribaya Primary Green
          50: '#f0f9f6',
          100: '#dcf1e9',
          200: '#bbe2d7',
          300: '#8ecabf',
          400: '#5fa89c',
          500: '#3f8c81',
          600: '#2d7068',
          700: '#0f4d39', // Base
          800: '#1e4844',
          900: '#1b3c39',
          950: '#0d2423',
        }
      }
    },
  },
  plugins: [],
}