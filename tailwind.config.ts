// tailwind.config.ts
// TITAN MENU OS — Tailwind Configuration

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Midnight Glass palette overrides
        brand: {
          cyan: '#22d3ee',
          'cyan-dark': '#06b6d4',
          crimson: '#ef4444',
          amber: '#f59e0b',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.25)',
        'glow-cyan-lg': '0 0 40px rgba(34, 211, 238, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.25)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.25)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'grid-cyan':
          'linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '40px 40px',
      },
      animation: {
        'bounce-subtle': 'bounce-subtle 2.5s ease-in-out infinite',
        'fade-up': 'fade-up 0.35s ease-out forwards',
        'slide-in-bottom': 'slide-in-bottom 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'pulse-border': 'pulse-border 1.5s ease-in-out infinite',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
          '50%': { transform: 'translateX(-50%) translateY(-4px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-bottom': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-border': {
          '0%, 100%': { borderColor: 'rgba(239, 68, 68, 0.3)' },
          '50%': { borderColor: 'rgba(239, 68, 68, 0.8)' },
        },
      },
      borderWidth: {
        '3': '3px',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
