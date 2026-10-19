import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger';

const TONES: Record<BadgeTone, { background: string; foreground: string }> = {
  neutral: { background: colors.surfaceRaised, foreground: colors.textMuted },
  accent: { background: colors.accentSoft, foreground: colors.accent },
  success: { background: colors.successSoft, foreground: colors.success },
  danger: { background: colors.dangerSoft, foreground: colors.danger },
};

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
};

/** A small status pill, e.g. "Alarm set" or "Admin". */
export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const { background, foreground } = TONES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      {icon ? <Icon name={icon} size={12} color={foreground} /> : null}
      <AppText variant="caption" style={[styles.label, { color: foreground }]} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + spacing.xxs,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  label: {
    fontWeight: '700',
  },
});
