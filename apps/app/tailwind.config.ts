import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent:        'var(--accent)',
        'accent-hover':'var(--accent-hover)',
        'accent-dim':  'var(--accent-dim)',
        'accent-dim-2':'var(--accent-dim-2)',
        bg:            'var(--bg)',
        'bg-2':        'var(--bg-2)',
        'bg-3':        'var(--bg-3)',
        'bg-4':        'var(--bg-4)',
        border:        'var(--border)',
        'border-light':'var(--border-light)',
        'border-focus':'var(--border-focus)',
        text:          'var(--text)',
        'text-2':      'var(--text-2)',
        'text-3':      'var(--text-3)',
        'text-4':      'var(--text-4)',
        green:         'var(--green)',
        'green-dim':   'var(--green-dim)',
        red:           'var(--red)',
        'red-dim':     'var(--red-dim)',
        blue:          'var(--blue)',
        'blue-dim':    'var(--blue-dim)',
        amber:         'var(--amber)',
        'amber-dim':   'var(--amber-dim)',
        purple:        'var(--purple)',
        'purple-dim':  'var(--purple-dim)',
      },
      fontFamily: {
        sans:    ['"DM Sans"', '-apple-system', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%':           { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        shimmer:   'shimmer 1.5s linear infinite',
        fadeUp:    'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        fadeIn:    'fadeIn 0.3s ease-out forwards',
        pulse:     'pulse 2s ease-in-out infinite',
        bounceDot: 'bounceDot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
