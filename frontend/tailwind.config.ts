import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#141B2E',
          soft: '#4B5468',
        },
        paper: '#F7F6F3',
        surface: '#FFFFFF',
        gold: {
          DEFAULT: '#A9781F',
          light: '#C99A3F',
          dark: '#8A6018',
        },
        rule: '#E4E0D6',
        success: '#3F7D5C',
        danger: '#B0473F',
        warning: '#C08A2E',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 27, 46, 0.06), 0 1px 3px rgba(20, 27, 46, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
