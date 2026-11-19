/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#111315',
        surface: '#191C20',
        elevated: '#22272D',
        border: '#30363D',
        primary: {
          DEFAULT: '#F07835',
          hover: '#E56828',
        },
        content: {
          DEFAULT: '#F3F4F0',
          muted: '#A3ABB4',
        },
        success: '#35B879',
        warning: '#E3B341',
        danger: '#E05B5B',
        info: '#56A6D9',
        // aliases suaves para migración
        accent: {
          DEFAULT: '#F07835',
          soft: '#22272D',
          dark: '#E56828',
        },
        ink: {
          950: '#111315',
          900: '#F3F4F0',
          800: '#F3F4F0',
          700: '#A3ABB4',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 28px -18px rgba(0, 0, 0, 0.55)',
      },
    },
  },
  plugins: [],
}
