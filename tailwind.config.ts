import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Space Grotesk', 'sans-serif'],
        brand: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        brand: {
          deep: 'var(--brand-deep)',
          surface: 'var(--brand-surface)',
          accent: 'var(--brand-accent)',
          accentLight: '#3385FF',
          accentDark: '#0047B3',
          accentGlow: 'rgba(0, 102, 255, 0.4)',
          neutral: '#E5E5E5',
          muted: 'var(--text-muted)',
          border: 'var(--card-border)',
          main: 'var(--text-main)',
          success: '#10B981',
          danger: '#EF4444'
        }
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'shimmer': 'shimmer 2.5s infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 4s ease-in-out infinite',
        'marquee': 'marquee 40s linear infinite',
        'beam': 'rotate-beam 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
        'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
          '100%': { transform: 'translateX(200%) skewX(-15deg)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(1deg)' }
        },
        glow: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1) blur(100px)' },
          '50%': { opacity: '0.8', transform: 'scale(1.1) blur(120px)' }
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        'rotate-beam': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', boxShadow: '0 0 20px rgba(0, 112, 255, 0.2)' },
          '50%': { opacity: '1', boxShadow: '0 0 40px rgba(0, 112, 255, 0.6)' }
        },
        'spin-around': {
          '0%': { transform: 'translateZ(0) rotate(0)' },
          '15%, 35%': { transform: 'translateZ(0) rotate(90deg)' },
          '65%, 85%': { transform: 'translateZ(0) rotate(270deg)' },
          '100%': { transform: 'translateZ(0) rotate(360deg)' },
        },
        'shimmer-slide': {
          to: { transform: 'translate(calc(100cqw - 100%), 0)' }
        }
      }
    }
  },
  plugins: [],
};
export default config;
