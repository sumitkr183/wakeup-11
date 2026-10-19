import type { TextStyle, ViewStyle } from 'react-native';

// The app uses a single dark "night" palette: the alarm screen is used in a
// dark room, and one theme keeps every screen consistent with it.

export const colors = {
  background: '#0A0E1A',
  ringBackground: '#05070F',
  surface: '#121829',
  surfaceRaised: '#1A2238',
  surfacePressed: '#222B45',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  text: '#F5F3EE',
  textMuted: '#9AA3B8',
  textSubtle: '#6B7489',
  accent: '#FFB224',
  accentStrong: '#FF8A3D',
  accentSoft: 'rgba(255, 178, 36, 0.14)',
  onAccent: '#1A1206',
  success: '#4ADE9B',
  successSoft: 'rgba(74, 222, 155, 0.14)',
  danger: '#FF7A6B',
  dangerSoft: 'rgba(255, 122, 107, 0.14)',
} as const;

/** Sunrise gradient for primary actions and highlights. */
export const gradients = {
  sunrise: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentStrong} 100%)`,
  heroGlow: 'radial-gradient(circle at 100% 0%, rgba(255, 138, 61, 0.22) 0%, rgba(255, 138, 61, 0) 70%)',
  ringGlow: 'radial-gradient(circle at 50% 35%, rgba(255, 138, 61, 0.28) 0%, rgba(5, 7, 15, 0) 65%)',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 76, fontWeight: '200', letterSpacing: -3, fontVariant: ['tabular-nums'] },
  largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  overline: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export const shadows = {
  card: { boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.28)' },
  glow: { boxShadow: '0px 10px 30px rgba(255, 138, 61, 0.35)' },
} satisfies Record<string, ViewStyle>;

export const MIN_TOUCH_TARGET = 48;
