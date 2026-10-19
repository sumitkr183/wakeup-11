import type { TextStyle } from 'react-native';

// The app uses a single dark "night" palette: the alarm screen is used in a
// dark room, and one theme keeps every screen consistent with it.

export const colors = {
  background: '#0E1424',
  ringBackground: '#070B16',
  surface: '#182036',
  surfaceRaised: '#222B44',
  border: '#2E3854',
  text: '#F4F1EA',
  textMuted: '#A3ABBD',
  accent: '#F5A524',
  onAccent: '#1A1206',
  success: '#5BD69A',
  danger: '#FF8A7A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 72, fontWeight: '700', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  overline: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export const MIN_TOUCH_TARGET = 48;
