import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Card } from './card';
import { IconCircle } from './icon-circle';
import type { IconName } from './icon';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
};

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <IconCircle name={icon} size={52} color={colors.textMuted} backgroundColor={colors.surfaceRaised} />
      <View style={styles.text}>
        <AppText variant="heading" style={styles.center}>
          {title}
        </AppText>
        <AppText tone="muted" style={styles.center}>
          {message}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  text: {
    gap: spacing.xs,
  },
  center: {
    textAlign: 'center',
  },
});
