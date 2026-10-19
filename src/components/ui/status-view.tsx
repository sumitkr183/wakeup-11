import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';

import { AppText } from './app-text';
import { Button } from './button';
import { Card } from './card';
import { IconCircle } from './icon-circle';

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

type ErrorViewProps = {
  error: unknown;
  onRetry?: () => void;
};

export function ErrorView({ error, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.center}>
      <IconCircle name="warning" size={64} color={colors.danger} backgroundColor={colors.dangerSoft} />
      <AppText variant="title" style={styles.centerText}>
        Couldn’t load this
      </AppText>
      <AppText tone="muted" style={styles.centerText}>
        {getErrorMessage(error)}
      </AppText>
      {onRetry ? (
        <View style={styles.retry}>
          <Button title="Try again" icon="refresh" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

/** Loading state for one section, so the rest of the screen stays usable. */
export function InlineLoading() {
  return <ActivityIndicator color={colors.accent} style={styles.inlineLoading} />;
}

/** Error state for one section, so the rest of the screen stays usable. */
export function InlineError({ error, onRetry }: ErrorViewProps) {
  return (
    <Card>
      <View style={styles.inlineHeader}>
        <IconCircle name="warning" size={36} color={colors.danger} backgroundColor={colors.dangerSoft} />
        <AppText variant="heading" style={styles.flex}>
          Couldn’t load this
        </AppText>
      </View>
      <AppText tone="muted">{getErrorMessage(error)}</AppText>
      {onRetry ? <Button title="Try again" icon="refresh" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  inlineLoading: {
    paddingVertical: spacing.xl,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  centerText: {
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});
