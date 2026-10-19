import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, gradients, radius, spacing } from '@/constants/theme';

export type CardProps = ViewProps & {
  /** Draws attention: accent border and a warm glow in the corner. */
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
    overflow: 'hidden',
  },
  highlighted: {
    borderColor: 'rgba(255, 178, 36, 0.4)',
    experimental_backgroundImage: gradients.heroGlow,
  },
});
