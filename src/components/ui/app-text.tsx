import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '@/constants/theme';

type Variant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'accent' | 'success' | 'danger' | 'onAccent';

const toneColors: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  accent: colors.accent,
  success: colors.success,
  danger: colors.danger,
  onAccent: colors.onAccent,
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
};

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  return <Text style={[styles[variant], { color: toneColors[tone] }, style]} {...rest} />;
}

const styles = StyleSheet.create(typography);
