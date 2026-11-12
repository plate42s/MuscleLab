/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: '#A62C39',
          brick: '#9B2330',
          deep: '#70151E',
        },
        cream: {
          DEFAULT: '#EDE2D2',
          oat: '#E3D9C9',
          sand: '#E6DEC9',
          mist: '#F4F4F6',
        },
        rose: {
          DEFAULT: '#BC8E8E',
          soft: '#D4B3B3',
        },
        gold: {
          DEFAULT: '#C4A35A',
          dark: '#9A7B3C',
          soft: '#F0E6C8',
          line: '#D4BC7D',
        },
        ink: {
          950: '#2A1216',
          900: '#3B1A1F',
          800: '#4A2A2F',
          700: '#5C3A3F',
        },
        accent: {
          DEFAULT: '#A62C39',
          soft: '#F0E6C8',
          dark: '#70151E',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -18px rgba(112, 21, 30, 0.35)',
      },
    },
  },
  plugins: [],
}
