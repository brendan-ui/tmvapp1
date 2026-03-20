import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1A2040',
          deep: '#2A3150',
          mid: '#3F486B',
        },
        'tmv-blue': '#6D7AB6',
        gold: {
          DEFAULT: '#C9A96E',
          light: '#DFC49A',
        },
        cream: '#F0F0F0',
        'tmv-red': '#C75050',
        'tmv-green': '#5CAA6E',
        'tmv-amber': '#D4A017',
      },
      fontFamily: {
        display: ['EB Garamond', 'serif'],
        body: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
