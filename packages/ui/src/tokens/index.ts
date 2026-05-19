export const colors = {
  bg:          '#0a0a0b',
  bg2:         '#111114',
  bg3:         '#18181d',
  bg4:         '#1e1e24',
  border:      'rgba(255,255,255,0.07)',
  borderLight: 'rgba(255,255,255,0.12)',
  borderFocus: 'rgba(232,255,71,0.4)',
  text:        '#f4f4f5',
  text2:       '#a1a1aa',
  text3:       '#71717a',
  text4:       '#52525b',
  accent:      '#e8ff47',
  accentHover: '#f0ff6a',
  accentDim:   'rgba(232,255,71,0.12)',
  accentDim2:  'rgba(232,255,71,0.06)',
  green:       '#47ff8e',
  greenDim:    'rgba(71,255,142,0.10)',
  red:         '#ff4747',
  redDim:      'rgba(255,71,71,0.10)',
  blue:        '#4796ff',
  blueDim:     'rgba(71,150,255,0.10)',
  amber:       '#ffb347',
  amberDim:    'rgba(255,179,71,0.10)',
  purple:      '#a78bfa',
  purpleDim:   'rgba(167,139,250,0.10)',
} as const;

export const spacing = {
  micro: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24,
  '2xl': 32, '3xl': 48, '4xl': 64, '5xl': 80, '6xl': 120,
} as const;

export const radii = {
  badge: 4, sm: 6, md: 8, card: 10, modal: 12, lg: 16, xl: 20, hero: 24,
} as const;

export const shadows = {
  sm:     '0 1px 3px rgba(0,0,0,0.4)',
  md:     '0 4px 16px rgba(0,0,0,0.5)',
  lg:     '0 8px 32px rgba(0,0,0,0.6)',
  accent: '0 8px 32px rgba(232,255,71,0.2)',
  glow:   '0 0 60px rgba(232,255,71,0.08)',
} as const;

export const fontSizes = {
  micro: 11, xs: 12, sm: 13, base: 14, lg: 15, xl: 16,
  '2xl': 20, '3xl': 24, '4xl': 32, '5xl': 48, '6xl': 64, hero: 88,
} as const;

export const transitions = {
  fast:   '100ms ease',
  base:   '150ms ease',
  smooth: '300ms cubic-bezier(0.16,1,0.3,1)',
  slow:   '500ms cubic-bezier(0.16,1,0.3,1)',
} as const;

export const motionTokens = {
  fadeUp: {
    initial:    { opacity: 0, y: 16 },
    animate:    { opacity: 1, y: 0 },
    exit:       { opacity: 0, y: -8 },
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as number[] },
  },
  fadeIn: {
    initial: { opacity: 0 }, animate: { opacity: 1 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  scaleIn: {
    initial:    { opacity: 0, scale: 0.96 },
    animate:    { opacity: 1, scale: 1 },
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as number[] },
  },
  slideRight: {
    initial:    { opacity: 0, x: 24 },
    animate:    { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as number[] },
  },
  hoverLift: { y: -2, transition: { duration: 0.15 } },
  press:     { scale: 0.97, transition: { duration: 0.1 } },
} as const;

export const stagger = {
  container: { transition: { staggerChildren: 0.05 } },
  item: {
    initial:    { opacity: 0, y: 8 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as number[] },
  },
} as const;
