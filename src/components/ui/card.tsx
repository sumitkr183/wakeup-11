import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export type CardProps = ViewProps & {
  highlighted?: boolean;
};

export function Card({ highlighted = false, style, ...rest }: CardProps) {
  return <View style={[styles.card, highlighted && styles.highlighted, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  highlighted: {
    borderColor: colors.accent,
  },
});
