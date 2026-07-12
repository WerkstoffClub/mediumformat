import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', 'html[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"Geist"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
