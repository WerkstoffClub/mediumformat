import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', 'html[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"Noto Sans Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
